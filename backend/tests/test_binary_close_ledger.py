"""Focused unit tests for binary close settlement ledger movements."""
from __future__ import annotations

import uuid
from decimal import Decimal
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock

import pytest

from app.models import AccountMovement, AccountMovementType, TradeStatus, TradeType
from app.services import trade_service as service
from app.services.trade_service import TradeError


class _ScalarResult:
    def __init__(self, value: Any) -> None:
        self.value = value

    def scalar_one_or_none(self) -> Any:
        return self.value


class FakeAsyncSession:
    """Small async-session fake for close_trade unit tests."""

    def __init__(self, trade: SimpleNamespace | None) -> None:
        self.trade = trade
        self.added: list[Any] = []
        self.execute = AsyncMock(return_value=_ScalarResult(trade))
        self.flush = AsyncMock()
        self.commit = AsyncMock()
        self.refresh = AsyncMock()

    def add(self, instance: Any) -> None:
        self.added.append(instance)


def _user(user_id: uuid.UUID) -> SimpleNamespace:
    return SimpleNamespace(id=user_id)


def _binary_trade(
    *,
    user_id: uuid.UUID,
    account_id: uuid.UUID,
    balance_usd: Decimal,
    investment_usd: Decimal = Decimal("50.00"),
    payout_pct: Decimal = Decimal("80"),
    status: TradeStatus = TradeStatus.OPEN,
) -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid.uuid4(),
        user_id=user_id,
        account_id=account_id,
        account=SimpleNamespace(id=account_id, balance_usd=balance_usd),
        type=TradeType.BINARY,
        status=status,
        investment_usd=investment_usd,
        payout_pct=payout_pct,
        pnl_usd=None,
        closed_at=None,
        r_multiple=None,
        post_trade_notes=None,
        followed_plan=None,
        mistakes=None,
        close_image_url=None,
    )


def _movements(db: FakeAsyncSession) -> list[AccountMovement]:
    return [item for item in db.added if isinstance(item, AccountMovement)]


def _patch_audit(monkeypatch: pytest.MonkeyPatch) -> AsyncMock:
    audit = AsyncMock()
    monkeypatch.setattr(service, "_emit_audit", audit)
    return audit


@pytest.mark.anyio
async def test_binary_win_close_creates_return_and_profit_movements(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user_id = uuid.uuid4()
    account_id = uuid.uuid4()
    trade = _binary_trade(
        user_id=user_id,
        account_id=account_id,
        balance_usd=Decimal("450.00"),
    )
    db = FakeAsyncSession(trade)
    audit = _patch_audit(monkeypatch)

    closed = await service.close_trade(
        db,
        user=_user(user_id),
        trade_id=trade.id,
        type=TradeType.BINARY,
        outcome="WIN",
        correlation_id="corr-win",
    )

    assert closed is trade
    assert trade.status == TradeStatus.CLOSED_WIN
    assert trade.pnl_usd == Decimal("40.00")
    assert trade.account.balance_usd == Decimal("540.00")
    movements = _movements(db)
    assert [m.movement_type for m in movements] == [
        AccountMovementType.TRADE_RETURN,
        AccountMovementType.TRADE_PROFIT,
    ]
    assert [m.amount for m in movements] == [Decimal("50.00"), Decimal("40.00")]
    assert [(m.previous_balance, m.post_balance) for m in movements] == [
        (Decimal("450.00"), Decimal("500.00")),
        (Decimal("500.00"), Decimal("540.00")),
    ]
    assert all(m.account_id == account_id for m in movements)
    assert all(m.occurred_at.tzinfo is not None for m in movements)
    assert db.flush.await_count == 2
    audit.assert_awaited_once()
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(trade)


@pytest.mark.anyio
async def test_binary_break_close_creates_return_movement_only(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user_id = uuid.uuid4()
    account_id = uuid.uuid4()
    trade = _binary_trade(
        user_id=user_id,
        account_id=account_id,
        balance_usd=Decimal("450.00"),
    )
    db = FakeAsyncSession(trade)
    audit = _patch_audit(monkeypatch)

    await service.close_trade(
        db,
        user=_user(user_id),
        trade_id=trade.id,
        type=TradeType.BINARY,
        outcome="BREAK",
    )

    assert trade.status == TradeStatus.CLOSED_BREAK
    assert trade.pnl_usd == Decimal("0.00")
    assert trade.account.balance_usd == Decimal("500.00")
    movements = _movements(db)
    assert len(movements) == 1
    movement = movements[0]
    assert movement.movement_type == AccountMovementType.TRADE_RETURN
    assert movement.amount == Decimal("50.00")
    assert movement.previous_balance == Decimal("450.00")
    assert movement.post_balance == Decimal("500.00")
    assert db.flush.await_count == 1
    audit.assert_awaited_once()
    db.commit.assert_awaited_once()


@pytest.mark.anyio
async def test_binary_loss_close_creates_no_settlement_movements(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user_id = uuid.uuid4()
    account_id = uuid.uuid4()
    trade = _binary_trade(
        user_id=user_id,
        account_id=account_id,
        balance_usd=Decimal("450.00"),
    )
    db = FakeAsyncSession(trade)
    audit = _patch_audit(monkeypatch)

    await service.close_trade(
        db,
        user=_user(user_id),
        trade_id=trade.id,
        type=TradeType.BINARY,
        outcome="LOSS",
    )

    assert trade.status == TradeStatus.CLOSED_LOSS
    assert trade.pnl_usd == Decimal("-50.00")
    assert trade.account.balance_usd == Decimal("450.00")
    assert _movements(db) == []
    db.flush.assert_not_awaited()
    audit.assert_awaited_once()
    db.commit.assert_awaited_once()


@pytest.mark.anyio
async def test_invalid_binary_close_creates_no_settlement_movements(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user_id = uuid.uuid4()
    account_id = uuid.uuid4()
    trade = _binary_trade(
        user_id=user_id,
        account_id=account_id,
        balance_usd=Decimal("450.00"),
    )
    db = FakeAsyncSession(trade)
    audit = _patch_audit(monkeypatch)

    with pytest.raises(TradeError) as exc_info:
        await service.close_trade(
            db,
            user=_user(user_id),
            trade_id=trade.id,
            type=TradeType.BINARY,
        )

    assert exc_info.value.code == "VALIDATION_ERROR"
    assert trade.status == TradeStatus.OPEN
    assert trade.account.balance_usd == Decimal("450.00")
    assert _movements(db) == []
    db.flush.assert_not_awaited()
    audit.assert_not_awaited()
    db.commit.assert_not_awaited()
    db.refresh.assert_not_awaited()
