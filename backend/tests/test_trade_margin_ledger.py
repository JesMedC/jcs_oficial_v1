"""Focused unit tests for trade margin ledger movements."""
from __future__ import annotations

import uuid
from decimal import Decimal
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock

import pytest

from app.models import AccountMovement, AccountMovementType, TradeType
from app.services import trade_service as service
from app.services.trade_service import TradeError


class FakeAsyncSession:
    """Small async-session fake for trade service unit tests."""

    def __init__(self) -> None:
        self.added: list[Any] = []
        self.flush = AsyncMock()
        self.commit = AsyncMock()
        self.refresh = AsyncMock()

    def add(self, instance: Any) -> None:
        self.added.append(instance)


def _user(user_id: uuid.UUID) -> SimpleNamespace:
    return SimpleNamespace(id=user_id)


def _account(
    *,
    account_id: uuid.UUID,
    user_id: uuid.UUID,
    workspace_id: uuid.UUID,
    balance_usd: Decimal,
) -> SimpleNamespace:
    return SimpleNamespace(
        id=account_id,
        user_id=user_id,
        workspace_id=workspace_id,
        balance_usd=balance_usd,
    )


def _movements(db: FakeAsyncSession) -> list[AccountMovement]:
    return [item for item in db.added if isinstance(item, AccountMovement)]


def _patch_open_trade_dependencies(
    monkeypatch: pytest.MonkeyPatch,
    *,
    account: SimpleNamespace,
    workspace_id: uuid.UUID,
) -> tuple[AsyncMock, AsyncMock, AsyncMock]:
    lookup = AsyncMock(return_value=account)
    infer_workspace = AsyncMock(return_value=workspace_id)
    discipline = AsyncMock()
    audit = AsyncMock()
    monkeypatch.setattr(service, "_get_owned_account", lookup)
    monkeypatch.setattr(service, "infer_workspace_id", infer_workspace)
    monkeypatch.setattr(service, "validate_open_trade", discipline)
    monkeypatch.setattr(service, "_emit_audit", audit)
    return lookup, discipline, audit


@pytest.mark.anyio
async def test_binary_open_trade_creates_negative_trade_margin_movement(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user_id = uuid.uuid4()
    account_id = uuid.uuid4()
    workspace_id = uuid.uuid4()
    db = FakeAsyncSession()
    account = _account(
        account_id=account_id,
        user_id=user_id,
        workspace_id=workspace_id,
        balance_usd=Decimal("500.00"),
    )
    lookup, discipline, audit = _patch_open_trade_dependencies(
        monkeypatch,
        account=account,
        workspace_id=workspace_id,
    )

    trade = await service.open_trade(
        db,
        user=_user(user_id),
        account_id=account_id,
        type=TradeType.BINARY,
        instrument="EURUSD",
        direction="CALL",
        investment_usd=Decimal("25.50"),
        payout_pct=Decimal("80"),
        expiration_seconds=60,
        jwt_workspace_ids=[workspace_id],
        correlation_id="corr-binary",
    )

    assert trade.account_id == account_id
    assert account.balance_usd == Decimal("474.50")
    movements = _movements(db)
    assert len(movements) == 1
    movement = movements[0]
    assert movement.account_id == account_id
    assert movement.movement_type == AccountMovementType.TRADE_MARGIN
    assert movement.amount == Decimal("-25.50")
    assert movement.previous_balance == Decimal("500.00")
    assert movement.post_balance == Decimal("474.50")
    assert movement.occurred_at.tzinfo is not None
    assert db.flush.await_count == 2
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(trade)
    lookup.assert_awaited_once_with(db, user_id=user_id, account_id=account_id)
    discipline.assert_awaited_once()
    audit.assert_awaited_once()


@pytest.mark.anyio
async def test_forex_open_trade_creates_negative_notional_trade_margin_movement(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user_id = uuid.uuid4()
    account_id = uuid.uuid4()
    workspace_id = uuid.uuid4()
    db = FakeAsyncSession()
    account = _account(
        account_id=account_id,
        user_id=user_id,
        workspace_id=workspace_id,
        balance_usd=Decimal("1000.00"),
    )
    _patch_open_trade_dependencies(
        monkeypatch,
        account=account,
        workspace_id=workspace_id,
    )

    await service.open_trade(
        db,
        user=_user(user_id),
        account_id=account_id,
        type=TradeType.FOREX,
        instrument="EURUSD",
        pair="EUR/USD",
        lot_size=Decimal("0.10"),
        direction="LONG",
        entry_price=Decimal("10.25"),
        stop_loss=Decimal("9.25"),
        jwt_workspace_ids=[workspace_id],
    )

    assert account.balance_usd == Decimal("897.50")
    movements = _movements(db)
    assert len(movements) == 1
    movement = movements[0]
    assert movement.movement_type == AccountMovementType.TRADE_MARGIN
    assert movement.amount == Decimal("-102.50")
    assert movement.previous_balance == Decimal("1000.00")
    assert movement.post_balance == Decimal("897.50")
    assert db.flush.await_count == 2
    db.commit.assert_awaited_once()


@pytest.mark.anyio
async def test_insufficient_balance_rejection_creates_no_trade_margin_movement(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user_id = uuid.uuid4()
    account_id = uuid.uuid4()
    workspace_id = uuid.uuid4()
    db = FakeAsyncSession()
    account = _account(
        account_id=account_id,
        user_id=user_id,
        workspace_id=workspace_id,
        balance_usd=Decimal("10.00"),
    )
    _lookup, discipline, audit = _patch_open_trade_dependencies(
        monkeypatch,
        account=account,
        workspace_id=workspace_id,
    )

    with pytest.raises(TradeError) as exc_info:
        await service.open_trade(
            db,
            user=_user(user_id),
            account_id=account_id,
            type=TradeType.BINARY,
            instrument="EURUSD",
            direction="PUT",
            investment_usd=Decimal("25.00"),
            payout_pct=Decimal("80"),
            expiration_seconds=60,
            jwt_workspace_ids=[workspace_id],
        )

    assert exc_info.value.code == "INSUFFICIENT_BALANCE"
    assert exc_info.value.status == 422
    assert account.balance_usd == Decimal("10.00")
    assert _movements(db) == []
    assert db.flush.await_count == 1
    db.commit.assert_not_awaited()
    db.refresh.assert_not_awaited()
    discipline.assert_awaited_once()
    audit.assert_not_awaited()
