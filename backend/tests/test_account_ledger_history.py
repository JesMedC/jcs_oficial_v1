"""Focused account movement history service tests."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock

import pytest

from app.models import AccountMovement, AccountMovementType
from app.services import trading_account_service as service
from app.services.trading_account_service import TradingAccountError


class _ScalarResult:
    def __init__(self, rows: list[AccountMovement]) -> None:
        self._rows = rows

    def scalars(self) -> _ScalarResult:
        return self

    def all(self) -> list[AccountMovement]:
        return self._rows


class FakeQuerySession:
    """Small async-session fake that records SQLAlchemy statements."""

    def __init__(self, rows: list[AccountMovement], total: int) -> None:
        self.rows = rows
        self.total = total
        self.executed: list[Any] = []
        self.scalar_statements: list[Any] = []

    async def execute(self, statement: Any) -> _ScalarResult:
        self.executed.append(statement)
        return _ScalarResult(self.rows)

    async def scalar(self, statement: Any) -> int:
        self.scalar_statements.append(statement)
        return self.total


def _movement(
    *,
    account_id: uuid.UUID,
    amount: Decimal,
    occurred_at: datetime,
) -> AccountMovement:
    previous_balance = Decimal("1000.00")
    return AccountMovement(
        id=uuid.uuid4(),
        account_id=account_id,
        movement_type=(
            AccountMovementType.DEPOSIT
            if amount > 0
            else AccountMovementType.WITHDRAWAL
        ),
        amount=amount,
        previous_balance=previous_balance,
        post_balance=previous_balance + amount,
        occurred_at=occurred_at,
    )


@pytest.mark.anyio
async def test_list_account_movements_returns_newest_first_page_and_total(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user_id = uuid.uuid4()
    account_id = uuid.uuid4()
    now = datetime.now(UTC)
    newest_page = [
        _movement(account_id=account_id, amount=Decimal("75.00"), occurred_at=now),
        _movement(
            account_id=account_id,
            amount=Decimal("-25.00"),
            occurred_at=now - timedelta(minutes=5),
        ),
    ]
    db = FakeQuerySession(rows=newest_page, total=5)
    lookup = AsyncMock(return_value=SimpleNamespace(id=account_id))
    monkeypatch.setattr(service, "_get_owned_active_account", lookup)

    rows, total = await service.list_account_movements(
        db,
        user_id=user_id,
        account_id=account_id,
        skip=2,
        limit=2,
    )

    assert rows == newest_page
    assert total == 5
    assert [row.occurred_at for row in rows] == sorted(
        [row.occurred_at for row in rows], reverse=True
    )
    lookup.assert_awaited_once_with(db, user_id=user_id, account_id=account_id)
    assert len(db.executed) == 1
    assert len(db.scalar_statements) == 1
    query_sql = str(db.executed[0].compile(compile_kwargs={"literal_binds": True}))
    count_sql = str(
        db.scalar_statements[0].compile(compile_kwargs={"literal_binds": True})
    )
    assert "ORDER BY account_movements.occurred_at DESC" in query_sql
    assert "account_movements.id DESC" in query_sql
    assert "LIMIT 2" in query_sql
    assert "OFFSET 2" in query_sql
    assert "count" in count_sql.lower()
    assert "WHERE account_movements.account_id" in count_sql


@pytest.mark.anyio
async def test_list_account_movements_propagates_owned_account_not_found(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user_id = uuid.uuid4()
    account_id = uuid.uuid4()
    db = FakeQuerySession(rows=[], total=0)
    not_found = TradingAccountError("NOT_FOUND", "missing", status=404)
    lookup = AsyncMock(side_effect=not_found)
    monkeypatch.setattr(service, "_get_owned_active_account", lookup)

    with pytest.raises(TradingAccountError) as exc_info:
        await service.list_account_movements(
            db,
            user_id=user_id,
            account_id=account_id,
            skip=0,
            limit=50,
        )

    assert exc_info.value is not_found
    lookup.assert_awaited_once_with(db, user_id=user_id, account_id=account_id)
    assert db.executed == []
    assert db.scalar_statements == []
