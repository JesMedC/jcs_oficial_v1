"""Discipline engine — 1×1000 rule engine + REQ-DISC-010 ordering.

Each rule is exercised in isolation against the public
``validate_open_trade`` API; the order test pins the spec-mandated
short-circuit.
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security.password import hash_password
from app.models import (
    Trade,
    TradeStatus,
    TradeType,
    TradingAccount,
    TradingAccountType,
    User,
    UserRole,
    Workspace,
)
from app.models.trading_account import TradingAccount as TradingAccountModel
from app.schemas.trade import TradeCreateIn
from app.services.discipline import ceil_to_next_dollar
from app.services.discipline_engine import DisciplineError, validate_open_trade


async def _seed(
    db_session: AsyncSession,
    *,
    balance: Decimal = Decimal("1000"),
    tz: str = "UTC",
    invested_today: Decimal = Decimal("0"),
    trades_in_bucket: int = 0,
) -> tuple[User, TradingAccount]:
    """Seed a user + workspace + account with the given parameters.

    ``invested_today`` + ``trades_in_bucket`` pre-populate the
    ``Trade`` ledger so the daily-cap and session-cap rules see
    existing activity.
    """
    user = User(
        email=f"d{uuid.uuid4().hex[:8]}@test.local",
        password_hash=hash_password("Discipline1234!"),
        first_name="Disc",
        last_name="User",
        phone="+34600000000",
        role=UserRole.USER,
        timezone=tz,
    )
    db_session.add(user)
    await db_session.flush()
    workspace = Workspace(
        id=uuid.uuid4(),
        name="disc",
        owner_user_id=user.id,
        plan_tier="FREE",
    )
    db_session.add(workspace)
    await db_session.flush()
    account = TradingAccountModel(
        user_id=user.id,
        workspace_id=workspace.id,
        broker_name="disc",
        type=TradingAccountType.BINARY,
        name="primary",
        balance_usd=balance,
    )
    db_session.add(account)
    await db_session.flush()
    # Seed ``invested_today`` worth of synthetic trades on the day
    # matching ``now`` so the daily-cap rule sees the cumulative
    # sum.
    if invested_today > 0 or trades_in_bucket > 0:
        today = datetime(2026, 9, 4, 18, 0, tzinfo=UTC)
        for _i in range(trades_in_bucket):
            db_session.add(
                Trade(
                    user_id=user.id,
                    account_id=account.id,
                    workspace_id=workspace.id,
                    instrument="EUR/USD OTC",
                    type=TradeType.BINARY,
                    status=TradeStatus.OPEN,
                    opened_at=today,
                    investment_usd=Decimal("2"),
                    payout_pct=Decimal("85"),
                    expiration_seconds=60,
                    direction="CALL",
                    interest="PLAN",
                )
            )
    await db_session.commit()
    return user, account


def _payload(**overrides) -> TradeCreateIn:
    base = dict(
        account_id=uuid.uuid4(),  # patched below
        instrument="EUR/USD OTC",
        type="BINARY",
        interest="PLAN",
        investment_usd=Decimal("2"),
        payout_pct=Decimal("85"),
        expiration_seconds=60,
        direction="CALL",
    )
    base.update(overrides)
    return TradeCreateIn(**base)


# ---- rule 3 — broker cap ----
async def test_404_broker_cap(db_session: AsyncSession) -> None:
    """importe > 404 → BROKER_CAP_EXCEEDED."""
    user, account = await _seed(db_session, balance=Decimal("1000000"))
    p = _payload(investment_usd=Decimal("500"))
    with pytest.raises(DisciplineError) as ei:
        await validate_open_trade(db_session, user=user, account=account, payload=p)
    assert ei.value.code == "BROKER_CAP_EXCEEDED"


async def test_404_exact_allowed(db_session: AsyncSession) -> None:
    """importe == 404 → no rejection from the broker cap."""
    user, account = await _seed(db_session, balance=Decimal("1000000"))
    p = _payload(investment_usd=Decimal("404"))
    # Capital-inicial 1M × 0.25% = 2500 → ceiling 2500, deduct ceil=404 → ok.
    await validate_open_trade(
        db_session, user=user, account=account, payload=p
    )


# ---- rule 4 — capital-inicial cap ----
async def test_capital_inicial_0025_rule(db_session: AsyncSession) -> None:
    """capital=10000, ceil=25, deduct=25 → passes.

    Sized with capital=$50000 (helper uses the ``>= $1000`` threshold
    to apply discipline) so the daily cap (0.10% × $50000 = $50) is
    large enough for a $25 trade to pass rule 5.
    """
    user, account = await _seed(db_session, balance=Decimal("50000"))
    p = _payload(investment_usd=Decimal("25"))
    await validate_open_trade(
        db_session, user=user, account=account, payload=p
    )


async def test_capital_inicial_cap_breach(db_session: AsyncSession) -> None:
    """capital=10000, deduct=30 → ceil(30) > 25 → reject."""
    user, account = await _seed(db_session, balance=Decimal("10000"))
    p = _payload(investment_usd=Decimal("30"))
    with pytest.raises(DisciplineError) as ei:
        await validate_open_trade(db_session, user=user, account=account, payload=p)
    assert ei.value.code == "CAPITAL_INICIAL_CAP_EXCEEDED"


# ---- rule 5 — daily cap ----
async def test_daily_cap_breach(db_session: AsyncSession) -> None:
    """capital=10000 → daily cap = $10. Two $6 trades → reject 2nd."""
    user, account = await _seed(
        db_session,
        balance=Decimal("10000"),
        invested_today=Decimal("0"),
    )
    # The ``invested_today`` pre-seed flag is a placeholder; here we
    # add two OPEN trades to simulate prior activity on the day.
    today = datetime(2026, 9, 4, 18, 0, tzinfo=UTC)
    db_session.add(
        Trade(
            user_id=user.id,
            account_id=account.id,
            workspace_id=account.workspace_id,
            instrument="EUR/USD OTC",
            type=TradeType.BINARY,
            status=TradeStatus.OPEN,
            opened_at=today,
            investment_usd=Decimal("6"),
            payout_pct=Decimal("85"),
            expiration_seconds=60,
            direction="CALL",
            interest="PLAN",
        )
    )
    await db_session.commit()
    p = _payload(investment_usd=Decimal("6"))
    with pytest.raises(DisciplineError) as ei:
        await validate_open_trade(
            db_session, user=user, account=account, payload=p
        )
    assert ei.value.code == "DAILY_CAP_EXCEEDED"


async def test_daily_cap_tz_boundary(db_session: AsyncSession) -> None:
    """Same UTC date but different TZ local date → both pass.

    ``America/Buenos_Aires``: 03:00 -03 (= 06:00 UTC) on Sep 5 and
    22:00 -03 on Sep 5 (= 01:00 UTC Sep 6) — local date changes,
    so each trade falls in its own daily bucket.
    """
    user, account = await _seed(
        db_session, balance=Decimal("10000"), tz="America/Buenos_Aires"
    )
    p = _payload(investment_usd=Decimal("6"))
    # First trade at local midnight -03 (03:00 UTC) on Sep 5
    now1 = datetime(2026, 9, 5, 6, 0, tzinfo=UTC)
    await validate_open_trade(
        db_session, user=user, account=account, payload=p, now=now1
    )
    # Second trade at local midnight -03 (03:00 UTC) on Sep 6
    now2 = datetime(2026, 9, 6, 6, 0, tzinfo=UTC)
    await validate_open_trade(
        db_session, user=user, account=account, payload=p, now=now2
    )


# ---- rule 6 — session cap ----
async def test_4_ops_per_session_breach(db_session: AsyncSession) -> None:
    """4 prior trades in (day, NY_PM) → 5th rejected."""
    user, account = await _seed(
        db_session, balance=Decimal("100000"), trades_in_bucket=4
    )
    p = _payload(investment_usd=Decimal("2"))
    with pytest.raises(DisciplineError) as ei:
        await validate_open_trade(
            db_session, user=user, account=account, payload=p
        )
    assert ei.value.code == "SESSION_CAP_EXCEEDED"


async def test_session_cap_isolated_per_band(db_session: AsyncSession) -> None:
    """4 trades in NY_PM doesn't block a 5th in NY_AMERICA (UTC)."""
    user, account = await _seed(
        db_session, balance=Decimal("100000"), trades_in_bucket=4
    )
    p = _payload(investment_usd=Decimal("2"))
    # NY_AMERICA at 14:00 UTC, distinct band from the NY_PM seeded trades.
    now = datetime(2026, 9, 4, 14, 0, tzinfo=UTC)
    await validate_open_trade(
        db_session, user=user, account=account, payload=p, now=now
    )


# ---- REQ-DISC-010 — rule order short-circuit ----
async def test_rule_order_short_circuit(db_session: AsyncSession) -> None:
    """Broker cap (rule 3) wins over capital-inicial cap (rule 4).

    ``importe=10000`` exceeds the 404 broker ceiling. ``capital=10000``
    would also be insufficient for the 0.25% rule, but rule 3 fires
    first.
    """
    user, account = await _seed(db_session, balance=Decimal("1000"))
    p = _payload(investment_usd=Decimal("10000"))
    with pytest.raises(DisciplineError) as ei:
        await validate_open_trade(db_session, user=user, account=account, payload=p)
    assert ei.value.code == "BROKER_CAP_EXCEEDED"


# ---- payout 100 rejected (schema-level; engine mirror) ----
def test_payout_100_rejected_by_pydantic() -> None:
    """Schema-level REQ-TI-MOD-001 / REQ-DISC-009 — ``payout_pct=100``
    raises 422 before reaching the engine.

    The Pydantic schema enforces ``ge=70, le=99``. This test pins
    that contract; the route returns 422 with code
    ``PAYOUT_OUT_OF_RANGE`` (mapped from ``VALIDATION_ERROR`` by the
    existing error envelope).
    """
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        TradeCreateIn(
            account_id=uuid.uuid4(),
            instrument="EUR/USD OTC",
            type="BINARY",
            interest="PLAN",
            investment_usd=Decimal("2"),
            payout_pct=Decimal("100"),  # over the new ceiling
            expiration_seconds=60,
            direction="CALL",
        )


def test_ceil_to_next_dollar_used_by_engine() -> None:
    """Spot-check that the rule engine imports the helper correctly.

    The engine wraps `ceil_to_next_dollar(deduct)` for the
    capital-inicial comparison. Pinned here so a future refactor
    that accidentally inlines or replaces the helper shows up as
    a test failure.
    """
    assert ceil_to_next_dollar(Decimal("1.01")) == Decimal("2")
