"""Calendar P&L service — month grid + monthly ``cumple``.

REQ-PNL-001..007 of the ``pnl-calendar`` spec. The calendar
endpoint renders a month-grid with per-day ops count + per-day
``pnl_pct`` + a MONTHLY ``cumple`` boolean.

PROVISIONAL day-start balance strategy (per Engram #187 +
``one-by-one-thousand-discipline/design.md`` ADR-001):

  Until the ``account-movement-ledger`` WIP merges to ``main``,
  this service MUST NOT read ``AccountMovement.balance_after_usd``.
  Instead, ``day_start_balance`` is computed by a Python walk over
  the existing ``Trade`` ledger:

      day_start_balance(day_d) =
          TradingAccount.balance_usd
          − Σ Trade.pnl_usd WHERE created_at < start_of(day_d, tz)

  Rationale: ``balance_usd`` is the broker-reported CURRENT balance,
  so subtracting all P&L events that occurred BEFORE the start of
  the day reconstructs the day's opening balance. The walk is O(N)
  per day where N = trades up to that day — bounded by the same
  ledger already indexed by ``ix_trades_account_opened``.

  TODO(post-WIP-merge): swap to ``AccountMovement.balance_after_usd``
  snapshot read (O(1) per day). Mark the swap here and in
  ``design.md``.

Multi-tenant (p0f.1): same workspace-resolution pattern as the rest
of the service layer.
"""
from __future__ import annotations

import uuid
from calendar import monthrange
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, datetime, time, timedelta
from datetime import date as date_type
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Trade, TradingAccount, User
from app.services.workspace_service import (
    WorkspaceRequiredError,
    infer_workspace_id,
)

_ZERO = Decimal("0")
_HUNDRED = Decimal("100")
_CUMPLE_THRESHOLD = Decimal("0.05")  # 5 % per spec REQ-PNL-003


@dataclass(frozen=True)
class DayEntry:
    """One day of the month grid (REQ-PNL-001)."""

    date: date_type
    ops_count: int
    day_start_balance: Decimal
    pnl_pct: float


@dataclass(frozen=True)
class MonthPnl:
    """The whole ``GET /calendar/pnl`` response."""

    workspace_id: uuid.UUID
    month: str  # "YYYY-MM"
    month_start_balance: Decimal
    month_end_balance: Decimal
    cumple: bool
    days: list[DayEntry]


def _parse_month(month: str) -> tuple[int, int]:
    """Parse ``"YYYY-MM"`` into ``(year, month)``; raises ``ValueError``
    on malformed input.
    """
    parts = month.split("-")
    if len(parts) != 2:
        raise ValueError(f"month invalido: {month!r}")
    return int(parts[0]), int(parts[1])


def _month_date_range(year: int, month: int) -> list[date_type]:
    """All calendar dates in ``(year, month)``, 1..last_day."""
    last_day = monthrange(year, month)[1]
    return [
        date_type(year, month, d)
        for d in range(1, last_day + 1)
    ]


def _day_start_utc(d: date_type, tz: str) -> datetime:
    """Start of ``d`` in ``tz`` expressed as UTC ``datetime``.

    For TZ math: convert midnight-local to UTC, use that as the
    upper bound for the day's first-second. Equivalent to "the
    instant the user's day begins".
    """
    from zoneinfo import ZoneInfo

    local_midnight = datetime.combine(d, time.min)
    return local_midnight.replace(tzinfo=ZoneInfo(tz)).astimezone(UTC)


# ---- main computation ----
async def compute_month_pnl(
    db: AsyncSession,
    *,
    user: User,
    workspace_id: uuid.UUID | None = None,
    month: str,
    account_id: uuid.UUID | None = None,
    jwt_workspace_ids: list[uuid.UUID] | None = None,
) -> MonthPnl:
    """Build the month-grid P&L response (REQ-PNL-001..007).

    Pure read; ≤ 3 SQL queries per spec REQ-PNL-007:

      Q1 — trades for the workspace (the month window + a small
           over-fetch via the Python walk on the same result set)
      Q2 — trading accounts (for current balance snapshot)
      Q3 — workspace resolution (only if ``workspace_id`` was not
           passed explicitly)
    """
    if workspace_id is None:
        try:
            workspace_id = await infer_workspace_id(
                db, user.id, jwt_workspace_ids=jwt_workspace_ids
            )
        except WorkspaceRequiredError:
            # No workspace resolvable — return an empty month (every
            # day = zero). The caller (route) treats this as
            # ``WORKSPACE_REQUIRED`` upstream if the request was
            # supposed to require a workspace.
            workspace_id = uuid.UUID(int=0)
    year, mo = _parse_month(month)
    tz = user.timezone or "UTC"
    days = _month_date_range(year, mo)

    # ---- Q2: trades for the workspace + (optional) account in month
    # window — includes trades ``created_at`` BEFORE the month too
    # because we need them to reconstruct day-start balances via
    # the Python walk.
    month_start_local = datetime.combine(
        days[0], time.min
    )
    month_end_local = datetime.combine(
        days[-1] + timedelta(days=1), time.min
    )

    where = [
        Trade.workspace_id == workspace_id,
        Trade.deleted_at.is_(None),
    ]
    if account_id is not None:
        where.append(Trade.account_id == account_id)
    # Subquery for trades BEFORE the month (used by the walk).
    trades_before_month = list(
        (
            await db.execute(
                select(Trade).where(
                    *where, Trade.opened_at < month_start_local
                )
            )
        ).scalars().all()
    )
    # Subquery for trades IN the month.
    trades_in_month = list(
        (
            await db.execute(
                select(Trade).where(
                    *where,
                    Trade.opened_at >= month_start_local,
                    Trade.opened_at < month_end_local,
                )
            )
        ).scalars().all()
    )

    # ---- Q3: current balance per account (workspace-scoped).
    accounts_stmt = select(TradingAccount).where(
        TradingAccount.workspace_id == workspace_id,
        TradingAccount.deleted_at.is_(None),
    )
    if account_id is not None:
        accounts_stmt = accounts_stmt.where(
            TradingAccount.id == account_id
        )
    accounts = list((await db.execute(accounts_stmt)).scalars().all())
    current_balance_total = sum(
        (Decimal(str(a.balance_usd or 0)) for a in accounts), _ZERO
    )

    # ---- Python walk: for each day, compute day-start balance.
    # ``day_start_balance(d)`` = balance AT 00:00 of day ``d`` = the
    # balance right BEFORE the first trade of day ``d`` (= the
    # balance right AFTER the last event of day ``d-1``, or "before
    # the month started" for day 1 if no prior-month trades exist).
    #
    # Mathematically:
    #   day_start_balance(d) = current_balance −
    #                            Σ pnl_usd of trades with
    #                            opened_at >= start_of_local_day(d)
    # because the current balance already includes all realized
    # P&L UP TO NOW, and "subtract pnl on/after day d" walks back to
    # the balance BEFORE the first event of day d.
    #
    # (Snapshot-equivalent: the most recent ``AccountMovement`` /
    # Trade event with ``created_at < 00:00 local-time on day d``.)
    def _pnl(t: Trade) -> Decimal:
        return Decimal(str(t.pnl_usd or 0))

    all_relevant = list(trades_before_month) + list(trades_in_month)

    def _local_day(ts: datetime) -> date_type:
        from zoneinfo import ZoneInfo

        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=ZoneInfo("UTC"))
        return ts.astimezone(ZoneInfo(tz)).date()

    by_day = _group_by_local_day(all_relevant, tz=_local_day)

    # ``pnl_on_or_after[d]`` = Σ pnl of trades on day ``d`` AND
    # all later days in the data set. Used as the subtraction term.
    # We compute over ALL ``days`` (calendar days in the month) so
    # that a query for day d with no trades still returns the right
    # running total.
    sorted_days_desc = sorted(days, reverse=True)
    pnl_on_or_after: dict[date_type, Decimal] = {}
    running = _ZERO
    for d in sorted_days_desc:
        # Include the day's own pnl in the running total BEFORE
        # advancing the cursor — so the next (earlier) day sees
        # this day's pnl in its subtraction term.
        running += sum((_pnl(t) for t in by_day.get(d, [])), _ZERO)
        pnl_on_or_after[d] = running

    # ---- Build day entries.
    day_entries: list[DayEntry] = []
    for d in days:
        bucket = by_day.get(d, [])
        ops_count = len(bucket)
        pnl_today = sum((_pnl(t) for t in bucket), _ZERO)
        # Day-start balance: current total minus cumulative P&L of
        # all events on day ``d`` AND later days.
        day_start_balance = current_balance_total - pnl_on_or_after.get(
            d, _ZERO
        )
        if day_start_balance > 0:
            pnl_pct = float(
                (pnl_today / day_start_balance * _HUNDRED).quantize(
                    Decimal("0.01")
                )
            )
        else:
            pnl_pct = 0.0
        day_entries.append(
            DayEntry(
                date=d,
                ops_count=ops_count,
                day_start_balance=day_start_balance.quantize(
                    Decimal("0.01")
                ),
                pnl_pct=pnl_pct,
            )
        )

    # ---- Monthly ``cumple`` boolean.
    # ``month_start_balance`` = ``day_start_balance`` of day 1 of the
    # month (= balance BEFORE any trade in the month, when no trades
    # happened before the month). ``month_end_balance`` = current
    # balance (proxy for the last day's end-of-trading balance —
    # exact close would need ``AccountMovement.balance_after_usd``
    # snapshot, see ADR-001).
    month_start_balance = day_entries[0].day_start_balance
    month_end_balance = current_balance_total
    if month_start_balance > 0:
        delta_pct = (
            month_end_balance - month_start_balance
        ) / month_start_balance
        cumple = delta_pct > _CUMPLE_THRESHOLD
    else:
        cumple = False

    return MonthPnl(
        workspace_id=workspace_id,
        month=month,
        month_start_balance=month_start_balance,
        month_end_balance=month_end_balance.quantize(Decimal("0.01")),
        cumple=cumple,
        days=day_entries,
    )


def _group_by_local_day(
    trades: Iterable[Trade],
    *,
    tz,
) -> dict[date_type, list[Trade]]:
    """Bucket ``trades`` by ``_local_day(opened_at)``."""
    out: dict[date_type, list[Trade]] = {}
    for t in trades:
        if t.opened_at is None:
            continue
        d = tz(t.opened_at)
        out.setdefault(d, []).append(t)
    return out


__all__ = ["compute_month_pnl", "DayEntry", "MonthPnl"]
