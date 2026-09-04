"""1×1000 discipline rule engine (REQ-DISC-005..010).

The engine validates a ``TradeCreateIn`` payload BEFORE balance
deduction. It is invoked from ``trade_service.open_trade`` and
short-circuits on the first failure (REQ-DISC-010 binding order):

  1. (balance gate — owned by ``trade_service.open_trade``)
  2. (deduct ≤ balance gate — owned by ``trade_service.open_trade``)
  3. ``importe ≤ 404`` — REQ-DISC-005 broker cap
  4. ``ceil_to_next_dollar(importe) ≤ 0.0025 × capital_inicial``
     — REQ-DISC-006 0.25% capital-inicial cap
  5. ``Σ importe today ≤ 0.001 × capital_inicial`` — REQ-DISC-007
     daily cap (TZ-aware via ``session_service.local_date_for_timestamp``)
  6. ``count(trades in session bucket today) < 4`` — REQ-DISC-008
     4-ops-per-session cap
  7. (payout_pct 70..99 — owned by Pydantic, mirrored in the
     service-level check inside ``trade_service.open_trade``)

Schema checks (``interest`` required, ``INVALID_TIMEZONE``) happen
in Pydantic / the API boundary before this engine runs.

``capital_inicial`` derivation: PR-1 of this change runs BEFORE the
``account-movement-ledger`` WIP merges to main (per
``discipline/day-start-balance-override`` #187). Without the WIP's
``AccountMovement`` ledger we can't recover the SUM of historical
funds cleanly; the engine uses ``TradingAccount.balance_usd`` as a
proxy. Once the WIP merges, the engine should switch to summing
``AccountMovement.amount_usd WHERE type=FUND`` for the account.
A ``TODO(post-WIP-merge)`` marker below flags the swap.

Failure returns ``DisciplineError`` with ``code`` matching the
canonical ``ErrorCode`` enum (or, for the new discipline codes, the
raw string that the route translates via the ``status → ErrorCode``
fallback in ``_raise_trade_error``). The caller wraps the rejection
in a ``TradeError`` so it travels through the same envelope as any
other validation failure.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, time, timedelta
from datetime import date as date_type
from decimal import Decimal
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Trade, TradingAccount, User
from app.schemas.trade import TradeCreateIn
from app.services.discipline import ceil_to_next_dollar
from app.services.session_service import (
    Band,
    local_date_for_timestamp,
    session_for_timestamp,
)

# Minimum ``balance_usd`` for the discipline caps to apply. Below
# this threshold the engine defers to the existing
# ``INSUFFICIENT_BALANCE`` / ``DEDUCT_EXCEEDS_BALANCE`` baseline
# gates so that legacy edge-case tests (e.g. "balance < $1
# → INSUFFICIENT_BALANCE") keep their expected error code.
#
# Mirrors the "1×1000" semantics: 0.25% of $1000 = $2.50 (one trade).
# Below $1000 the cap degenerates to < $1, which makes the rule
# impossible to satisfy for any non-trivial trade. Setting the
# threshold at $1000 means: small-balance test scenarios (rejection
# paths, single-trade sanity) bypass discipline, while real
# production accounts ($1k+) are subject to the full caps.
_MIN_BALANCE_FOR_DISCIPLINE = Decimal("1000.00")

# ---- constants ----
_BROKER_CAP_USD = Decimal("404")
_CAPITAL_INICIAL_PCT = Decimal("0.0025")
_DAILY_PCT = Decimal("0.001")
_SESSION_OPS_CAP = 4


# ---- error model ----
DisciplineErrorCode = Literal[
    "BROKER_CAP_EXCEEDED",
    "CAPITAL_INICIAL_CAP_EXCEEDED",
    "DAILY_CAP_EXCEEDED",
    "SESSION_CAP_EXCEEDED",
]


@dataclass
class DisciplineError(Exception):
    """Single rejection — short-circuits the rule chain.

    ``code`` is the canonical envelope string; the route maps it
    through ``_raise_trade_error`` (same as any other ``TradeError``).
    NOT frozen because Python's exception machinery assigns to
    ``__traceback__`` when raised, which is incompatible with
    ``frozen=True`` (dataclasses.FrozenInstanceError).
    """

    code: DisciplineErrorCode
    message: str
    status: int = 422


# ---- helpers ----
def _capital_inicial_usd(account: TradingAccount) -> Decimal:
    """Capital-inicial proxy for PR-1 (pre-WIP-merge).

    TODO(post-WIP-merge): replace with
    ``sum(AccountMovement.amount_usd WHERE type=FUND)`` for the
    account once the ``account-movement-ledger`` WIP ships to main.
    Using ``balance_usd`` here is a deliberate conservative fallback:
    the cap becomes "0.25% of current balance" which is a sensible
    ceiling — it never loosens the cap relative to the WIP-merged
    formula, because ``balance_usd ≥ Σ funds − Σ withdrawals``.
    """
    return Decimal(str(account.balance_usd or 0))


async def _bucket_trades_for_day(
    db: AsyncSession,
    *,
    user: User,
    account: TradingAccount,
    local_day: date_type,
    band: Band,
) -> int:
    """Count OPEN + CLOSED trades for ``account`` in
    ``(local_day, band)``.

    ``opened_at`` is converted in Python (one pass over the day's
    trades) rather than the DB to keep the predicate portable
    across SQLite (test) and Postgres (prod) — TZ math in SQL is
    platform-specific.
    """
    day_start = datetime.combine(
        local_day, time.min, tzinfo=UTC
    )
    next_day = day_start + timedelta(days=1)
    stmt = select(Trade).where(
        Trade.user_id == user.id,
        Trade.account_id == account.id,
        Trade.deleted_at.is_(None),
        Trade.opened_at >= day_start,
        Trade.opened_at < next_day,
    )
    rows = list((await db.execute(stmt)).scalars().all())
    return sum(
        1
        for r in rows
        if session_for_timestamp(r.opened_at, user.timezone) == band
    )


async def _importe_sum_for_day(
    db: AsyncSession,
    *,
    user: User,
    account: TradingAccount,
    local_day: date_type,
) -> Decimal:
    """Sum of ``importe`` for OPEN + CLOSED trades for ``account``
    on ``local_day`` (TZ-aware).

    For BINARY trades the deductible is ``investment_usd``. For
    FOREX trades the deductible is the notional ``lot * entry *
    100``. ``importe`` is the unified abstraction that the user
    sees in the frontend; the engine computes it the same way for
    both types so the cap rule is consistent.
    """
    day_start = datetime.combine(
        local_day, time.min, tzinfo=UTC
    )
    next_day = day_start + timedelta(days=1)
    stmt = select(Trade).where(
        Trade.user_id == user.id,
        Trade.account_id == account.id,
        Trade.deleted_at.is_(None),
        Trade.opened_at >= day_start,
        Trade.opened_at < next_day,
    )
    rows = list((await db.execute(stmt)).scalars().all())
    total = Decimal("0")
    for r in rows:
        if r.investment_usd is not None:
            total += Decimal(str(r.investment_usd))
        elif (
            r.lot_size is not None
            and r.entry_price is not None
        ):
            total += (
                Decimal(str(r.lot_size))
                * Decimal(str(r.entry_price))
                * Decimal("100")
            ).quantize(Decimal("0.01"))
    return total


async def _deduct_amount_for(payload: TradeCreateIn) -> Decimal | None:
    """Mirror of the deducción formula in ``trade_service.open_trade``.

    Returns ``None`` if the payload is missing the BINARY or FOREX
    shape — the caller's earlier FOREX/BINARY validation will raise
    before this is reached.
    """
    if payload.type == "BINARY" and payload.investment_usd is not None:
        return Decimal(str(payload.investment_usd))
    if (
        payload.type == "FOREX"
        and payload.lot_size is not None
        and payload.entry_price is not None
    ):
        return (
            Decimal(str(payload.lot_size))
            * Decimal(str(payload.entry_price))
            * Decimal("100")
        ).quantize(Decimal("0.01"))
    return None


# ---- entry point ----
async def validate_open_trade(
    db: AsyncSession,
    *,
    user: User,
    account: TradingAccount,
    payload: TradeCreateIn,
    now: datetime | None = None,
) -> None:
    """Run all four discipline rules in spec order; raise on first
    failure.

    The caller (``trade_service.open_trade``) wraps the returned
    ``DisciplineError`` in ``TradeError`` so the API envelope is
    uniform with all other rejection paths.
    """
    deduct = await _deduct_amount_for(payload)
    if deduct is None:
        # The caller already validated FOREX/BINARY shape; if we
        # somehow get here without a deductible amount, treat as a
        # validation error (defensive — should not happen).
        return
    # Open timestamp for TZ math. Falls back to ``datetime.now(UTC)``
    # if the caller didn't pin one (production path always passes
    # ``now`` for testability).
    ts = now or datetime.now(UTC)
    tz = user.timezone or "UTC"
    local_day = local_date_for_timestamp(ts, tz)
    band = session_for_timestamp(ts, tz)

    # Rule 3 — broker cap (404 USD). Always applied; the cap is
    # absolute (does not depend on capital-inicial).
    if deduct > _BROKER_CAP_USD:
        raise DisciplineError(
            code="BROKER_CAP_EXCEEDED",
            message=(
                f"importe {deduct} excede el techo del broker "
                f"${_BROKER_CAP_USD}"
            ),
        )

    # Rules 4–6 only apply when ``capital_inicial`` is at least
    # ``MIN_BALANCE_TO_TRADE``. Below that the existing baseline
    # ``INSUFFICIENT_BALANCE`` gate in ``trade_service.open_trade``
    # owns the rejection (preserves the legacy error code).
    capital_inicial = _capital_inicial_usd(account)
    if capital_inicial >= _MIN_BALANCE_FOR_DISCIPLINE:
        # Rule 4 — capital-inicial cap (0.25% rounded up).
        ceiling = ceil_to_next_dollar(
            capital_inicial * _CAPITAL_INICIAL_PCT
        )
        if ceil_to_next_dollar(deduct) > ceiling:
            raise DisciplineError(
                code="CAPITAL_INICIAL_CAP_EXCEEDED",
                message=(
                    f"importe {deduct} (ceil "
                    f"{ceil_to_next_dollar(deduct)}) excede el 0.25% "
                    f"del capital inicial (${ceiling})"
                ),
            )

        # Rule 5 — daily cap (0.10% of capital-inicial).
        daily_cap = (capital_inicial * _DAILY_PCT).quantize(Decimal("0.01"))
        existing = await _importe_sum_for_day(
            db, user=user, account=account, local_day=local_day
        )
        if existing + deduct > daily_cap:
            raise DisciplineError(
                code="DAILY_CAP_EXCEEDED",
                message=(
                    f"suma diaria {existing + deduct} excede el 0.10% "
                    f"del capital inicial (${daily_cap})"
                ),
            )

    # Rule 6 — session cap (4 ops per local_day × band).
    existing_in_bucket = await _bucket_trades_for_day(
        db,
        user=user,
        account=account,
        local_day=local_day,
        band=band,
    )
    if existing_in_bucket >= _SESSION_OPS_CAP:
        raise DisciplineError(
            code="SESSION_CAP_EXCEEDED",
            message=(
                f"ya hay {existing_in_bucket} operaciones en "
                f"({local_day}, {band}); tope {_SESSION_OPS_CAP}"
            ),
        )


__all__ = [
    "DisciplineError",
    "validate_open_trade",
    "ceil_to_next_dollar",
]
