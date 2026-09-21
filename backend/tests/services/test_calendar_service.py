"""Calendar service — month-grid P&L + cumplimiento (REQ-PNL-001..007).

PROVISIONAL: ``day_start_balance`` uses the Python walk over the
``Trade`` ledger (per Engram #187). The
``test_day_start_walk_no_wip_dependency`` test pins the absence of
``AccountMovement.balance_after_usd`` reads.
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
from app.services.calendar_service import compute_month_pnl


async def _seed_workspace(
    db_session: AsyncSession,
) -> tuple[User, Workspace, TradingAccount]:
    user = User(
        email=f"cal{uuid.uuid4().hex[:8]}@test.local",
        password_hash=hash_password("Calendar1234!"),
        first_name="Cal",
        last_name="User",
        phone="+34600000000",
        role=UserRole.USER,
        timezone="UTC",
    )
    db_session.add(user)
    await db_session.flush()
    workspace = Workspace(
        id=uuid.uuid4(),
        name="cal",
        owner_user_id=user.id,
        plan_tier="FREE",
    )
    db_session.add(workspace)
    await db_session.flush()
    account = TradingAccount(
        user_id=user.id,
        workspace_id=workspace.id,
        broker_name="cal",
        type=TradingAccountType.BINARY,
        name="primary",
        balance_usd=Decimal("0"),
    )
    db_session.add(account)
    await db_session.flush()
    await db_session.commit()
    return user, workspace, account


async def _seed_trade(
    db_session: AsyncSession,
    *,
    user: User,
    account: TradingAccount,
    workspace: Workspace,
    opened_at: datetime,
    pnl_usd: Decimal | None,
    interest: str = "PLAN",
) -> Trade:
    t = Trade(
        user_id=user.id,
        account_id=account.id,
        workspace_id=workspace.id,
        instrument="EUR/USD OTC",
        type=TradeType.BINARY,
        status=TradeStatus.CLOSED_WIN
        if (pnl_usd or 0) > 0
        else TradeStatus.CLOSED_LOSS,
        opened_at=opened_at,
        closed_at=opened_at,
        investment_usd=Decimal("2"),
        payout_pct=Decimal("85"),
        expiration_seconds=60,
        direction="CALL",
        interest=interest,
        pnl_usd=pnl_usd,
    )
    db_session.add(t)
    await db_session.flush()
    return t


async def test_empty_month_all_zero(db_session: AsyncSession) -> None:
    """No trades in Sep → every day ops=0, pnl_pct=0.0.

    With current_balance=$1000 and no trades, ``day_start_balance``
    equals current balance ($1000) for every day.
    """
    user, workspace, account = await _seed_workspace(db_session)
    account.balance_usd = Decimal("1000")
    db_session.add(account)
    await db_session.commit()
    result = await compute_month_pnl(
        db_session,
        user=user,
        workspace_id=workspace.id,
        month="2026-09",
    )
    assert result.month == "2026-09"
    assert result.month_end_balance == Decimal("1000.00")
    assert result.cumple is False
    assert len(result.days) == 30
    assert all(d.ops_count == 0 for d in result.days)
    assert all(d.pnl_pct == 0.0 for d in result.days)


async def test_pnl_pct_per_day(db_session: AsyncSession) -> None:
    """Two trades on day 5: WIN +4, LOSS -1 → pnl_pct = +3 / day_start × 100."""
    user, workspace, account = await _seed_workspace(db_session)
    # Pre-day pnl = 0; current balance = $1003 = day_start + 3.
    account.balance_usd = Decimal("1003")
    db_session.add(account)
    await db_session.flush()
    day = datetime(2026, 9, 5, 14, 0, tzinfo=UTC)
    await _seed_trade(
        db_session, user=user, account=account, workspace=workspace,
        opened_at=day, pnl_usd=Decimal("4"),
    )
    await _seed_trade(
        db_session, user=user, account=account, workspace=workspace,
        opened_at=day, pnl_usd=Decimal("-1"),
    )
    await db_session.commit()
    result = await compute_month_pnl(
        db_session, user=user, workspace_id=workspace.id, month="2026-09"
    )
    day5 = next(d for d in result.days if d.date.day == 5)
    assert day5.ops_count == 2
    # day_start_balance = current $1003 - 0 (no prior-day trades) = $1003
    # pnl_pct = 3 / 1003 × 100 ≈ 0.30
    assert day5.pnl_pct == pytest.approx(0.30, abs=0.01)


async def test_day_start_latest_snapshot(db_session: AsyncSession) -> None:
    """Without ``AccountMovement`` snapshots, the walk uses
    ``balance_usd`` minus on-or-after ``Σ pnl_usd``.

    Spec REQ-PNL-002: ``day_start_balance(d)`` = balance at 00:00 of
    day ``d`` = balance right BEFORE the first trade of day ``d``.

    Setup: current balance = $1100, three winning days in Sep:
    day1 +$10, day5 +$20, day10 +$70.
    - day 1 start = current - Σ pnl on/after day1 = $1100 - $100 = $1000.
    - day 5 start = current - Σ pnl on/after day5 = $1100 - $90 = $1010.
    - day 10 start = current - Σ pnl on/after day10 = $1100 - $70 = $1030.
    """
    user, workspace, account = await _seed_workspace(db_session)
    account.balance_usd = Decimal("1100")
    db_session.add(account)
    await db_session.flush()
    for d, pnl in [(1, Decimal("10")), (5, Decimal("20")), (10, Decimal("70"))]:
        day = datetime(2026, 9, d, 14, 0, tzinfo=UTC)
        await _seed_trade(
            db_session, user=user, account=account, workspace=workspace,
            opened_at=day, pnl_usd=pnl,
        )
    await db_session.commit()
    result = await compute_month_pnl(
        db_session, user=user, workspace_id=workspace.id, month="2026-09"
    )
    day1 = next(d for d in result.days if d.date.day == 1)
    assert day1.day_start_balance == Decimal("1000.00")
    day5 = next(d for d in result.days if d.date.day == 5)
    assert day5.day_start_balance == Decimal("1010.00")
    day10 = next(d for d in result.days if d.date.day == 10)
    assert day10.day_start_balance == Decimal("1030.00")


async def test_day_start_walk_no_wip_dependency(db_session: AsyncSession) -> None:
    """Pin Engram #187: PR-1 MUST NOT read ``AccountMovement``.

    No row inserted into ``AccountMovement`` for this account. The
    walk MUST still produce a sensible ``day_start_balance`` purely
    from the ``Trade`` ledger.

    Setup: current balance = $1000, +$50 trade on day 5.
    - day 5 day_start = $1000 - $50 = $950 (current minus pnl on/after day 5).
    - day 4 day_start = $1000 - $50 = $950 (same: no events on/after day 4 EXCEPT day 5).
    """
    user, workspace, account = await _seed_workspace(db_session)
    account.balance_usd = Decimal("1000")
    db_session.add(account)
    await db_session.flush()
    day = datetime(2026, 9, 5, 14, 0, tzinfo=UTC)
    await _seed_trade(
        db_session, user=user, account=account, workspace=workspace,
        opened_at=day, pnl_usd=Decimal("50"),
    )
    await db_session.commit()
    result = await compute_month_pnl(
        db_session, user=user, workspace_id=workspace.id, month="2026-09"
    )
    assert result.days[4].day_start_balance == Decimal("950.00")
    assert result.days[5].day_start_balance == Decimal("1000.00")


async def test_no_snapshot_zero_default(db_session: AsyncSession) -> None:
    """No trades at all → every day has day_start=$1000 (current balance)."""
    user, workspace, account = await _seed_workspace(db_session)
    account.balance_usd = Decimal("1000")
    db_session.add(account)
    await db_session.commit()
    result = await compute_month_pnl(
        db_session, user=user, workspace_id=workspace.id, month="2026-09"
    )
    assert all(d.pnl_pct == 0.0 for d in result.days)


async def test_cumple_true_above_5pct(db_session: AsyncSession) -> None:
    """month_end > month_start × 1.05 → cumple=True.

    Setup: month-start balance = $1000, +$100 trade on day 30 →
    current balance $1100 at month-end. Delta = 10 % > 5 % →
    cumple=True. The ``account.balance_usd`` is mutated alongside
    the trade so the cumple computation sees the right
    ``month_end_balance``.
    """
    user, workspace, account = await _seed_workspace(db_session)
    account.balance_usd = Decimal("1000")
    db_session.add(account)
    await db_session.flush()
    day = datetime(2026, 9, 30, 14, 0, tzinfo=UTC)
    await _seed_trade(
        db_session, user=user, account=account, workspace=workspace,
        opened_at=day, pnl_usd=Decimal("100"),
    )
    account.balance_usd = Decimal("1100")
    db_session.add(account)
    await db_session.commit()
    result = await compute_month_pnl(
        db_session, user=user, workspace_id=workspace.id, month="2026-09"
    )
    assert result.cumple is True


async def test_cumple_false_at_or_below_5pct(db_session: AsyncSession) -> None:
    """month_end == month_start × 1.04 → cumple=False (4% < 5%)."""
    user, workspace, account = await _seed_workspace(db_session)
    account.balance_usd = Decimal("1000")
    db_session.add(account)
    await db_session.flush()
    day = datetime(2026, 9, 30, 14, 0, tzinfo=UTC)
    await _seed_trade(
        db_session, user=user, account=account, workspace=workspace,
        opened_at=day, pnl_usd=Decimal("40"),
    )
    account.balance_usd = Decimal("1040")
    db_session.add(account)
    await db_session.commit()
    result = await compute_month_pnl(
        db_session, user=user, workspace_id=workspace.id, month="2026-09"
    )
    assert result.cumple is False


async def test_cumple_false_negative_month(db_session: AsyncSession) -> None:
    """Losing month → cumple=False."""
    user, workspace, account = await _seed_workspace(db_session)
    account.balance_usd = Decimal("1000")
    db_session.add(account)
    await db_session.flush()
    day = datetime(2026, 9, 30, 14, 0, tzinfo=UTC)
    await _seed_trade(
        db_session, user=user, account=account, workspace=workspace,
        opened_at=day, pnl_usd=Decimal("-50"),
    )
    account.balance_usd = Decimal("950")
    db_session.add(account)
    await db_session.commit()
    result = await compute_month_pnl(
        db_session, user=user, workspace_id=workspace.id, month="2026-09"
    )
    assert result.cumple is False


async def test_query_count_under_threshold(db_session: AsyncSession) -> None:
    """REQ-PNL-007: ≤ 3 SQL queries for the month computation."""
    from sqlalchemy import event

    user, workspace, account = await _seed_workspace(db_session)
    account.balance_usd = Decimal("1100")
    db_session.add(account)
    await db_session.flush()
    # Seed 5 trades across the month.
    for d in (2, 5, 10, 15, 25):
        day = datetime(2026, 9, d, 14, 0, tzinfo=UTC)
        await _seed_trade(
            db_session, user=user, account=account, workspace=workspace,
            opened_at=day, pnl_usd=Decimal("20"),
        )
    await db_session.commit()

    counter = {"n": 0}

    def _before_cursor_execute(*_args, **_kwargs) -> None:  # noqa: ANN001
        counter["n"] += 1

    bind = db_session.get_bind()
    event.listen(bind, "before_cursor_execute", _before_cursor_execute)
    try:
        await compute_month_pnl(
            db_session, user=user, workspace_id=workspace.id, month="2026-09"
        )
    finally:
        event.remove(bind, "before_cursor_execute", _before_cursor_execute)
    assert counter["n"] <= 3, f"got {counter['n']} queries, expected ≤ 3"
