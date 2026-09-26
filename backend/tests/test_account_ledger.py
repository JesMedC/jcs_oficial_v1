"""Focused account ledger unit tests for fund/withdraw balance movements."""
from __future__ import annotations

import uuid
from decimal import Decimal
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock

import pytest

from app.models import AccountMovement, AccountMovementType
from app.services import trading_account_service as service
from app.services.trading_account_service import TradingAccountError


class FakeAsyncSession:
    """Small async-session fake for service unit tests."""

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
    balance_usd: Decimal,
) -> SimpleNamespace:
    return SimpleNamespace(
        id=account_id,
        user_id=user_id,
        balance_usd=balance_usd,
    )


def _only_movement(db: FakeAsyncSession) -> AccountMovement:
    assert len(db.added) == 1
    movement = db.added[0]
    assert isinstance(movement, AccountMovement)
    return movement


@pytest.mark.anyio
async def test_fund_account_creates_deposit_ledger_values(monkeypatch: pytest.MonkeyPatch) -> None:
    user_id = uuid.uuid4()
    account_id = uuid.uuid4()
    db = FakeAsyncSession()
    account = _account(
        account_id=account_id,
        user_id=user_id,
        balance_usd=Decimal("0.00"),
    )
    lookup = AsyncMock(return_value=account)
    audit = AsyncMock()
    monkeypatch.setattr(service, "_get_owned_active_account", lookup)
    monkeypatch.setattr(service, "_emit_audit", audit)

    result = await service.fund_account(
        db,
        user=_user(user_id),
        account_id=account_id,
        amount=Decimal("250.00"),
        correlation_id="corr-fund",
    )

    assert result is account
    assert account.balance_usd == Decimal("250.00")
    movement = _only_movement(db)
    assert movement.account_id == account_id
    assert movement.movement_type == AccountMovementType.DEPOSIT
    assert movement.amount == Decimal("250.00")
    assert movement.previous_balance == Decimal("0.00")
    assert movement.post_balance == Decimal("250.00")
    assert movement.occurred_at.tzinfo is not None
    db.flush.assert_awaited_once()
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(account)
    lookup.assert_awaited_once_with(db, user_id=user_id, account_id=account_id)
    audit.assert_awaited_once()


@pytest.mark.anyio
async def test_withdraw_account_creates_withdrawal_ledger_values(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user_id = uuid.uuid4()
    account_id = uuid.uuid4()
    db = FakeAsyncSession()
    account = _account(
        account_id=account_id,
        user_id=user_id,
        balance_usd=Decimal("500.00"),
    )
    lookup = AsyncMock(return_value=account)
    audit = AsyncMock()
    monkeypatch.setattr(service, "_get_owned_active_account", lookup)
    monkeypatch.setattr(service, "_emit_audit", audit)

    result = await service.withdraw_account(
        db,
        user=_user(user_id),
        account_id=account_id,
        amount=Decimal("125.50"),
        correlation_id="corr-withdraw",
    )

    assert result is account
    assert account.balance_usd == Decimal("374.50")
    movement = _only_movement(db)
    assert movement.account_id == account_id
    assert movement.movement_type == AccountMovementType.WITHDRAWAL
    assert movement.amount == Decimal("-125.50")
    assert movement.previous_balance == Decimal("500.00")
    assert movement.post_balance == Decimal("374.50")
    assert movement.occurred_at.tzinfo is not None
    db.flush.assert_awaited_once()
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(account)
    lookup.assert_awaited_once_with(db, user_id=user_id, account_id=account_id)
    audit.assert_awaited_once()


@pytest.mark.anyio
async def test_rejected_overdraft_creates_no_withdrawal_ledger_row(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user_id = uuid.uuid4()
    account_id = uuid.uuid4()
    db = FakeAsyncSession()
    account = _account(
        account_id=account_id,
        user_id=user_id,
        balance_usd=Decimal("100.00"),
    )
    lookup = AsyncMock(return_value=account)
    audit = AsyncMock()
    monkeypatch.setattr(service, "_get_owned_active_account", lookup)
    monkeypatch.setattr(service, "_emit_audit", audit)

    with pytest.raises(TradingAccountError) as exc_info:
        await service.withdraw_account(
            db,
            user=_user(user_id),
            account_id=account_id,
            amount=Decimal("150.00"),
        )

    assert exc_info.value.code == "INSUFFICIENT_BALANCE"
    assert exc_info.value.status == 422
    assert account.balance_usd == Decimal("100.00")
    assert db.added == []
    db.flush.assert_not_awaited()
    db.commit.assert_not_awaited()
    db.refresh.assert_not_awaited()
    lookup.assert_awaited_once_with(db, user_id=user_id, account_id=account_id)
    audit.assert_not_awaited()
