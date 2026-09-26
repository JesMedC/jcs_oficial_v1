"""Immutable balance movement ledger for trading accounts."""
from __future__ import annotations

import enum
import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, Index, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.trading_account import TradingAccount


class AccountMovementType(str, enum.Enum):
    DEPOSIT = "DEPOSIT"
    WITHDRAWAL = "WITHDRAWAL"
    TRADE_MARGIN = "TRADE_MARGIN"
    TRADE_RETURN = "TRADE_RETURN"
    TRADE_PROFIT = "TRADE_PROFIT"


class AccountMovement(Base):
    """Append-only account balance ledger row for capital movements."""

    __tablename__ = "account_movements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("trading_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    movement_type: Mapped[AccountMovementType] = mapped_column(
        Enum(
            AccountMovementType,
            name="account_movement_type",
            values_callable=lambda enum: [m.value for m in enum],
        ),
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    previous_balance: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    post_balance: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
    )

    account: Mapped[TradingAccount] = relationship()

    __table_args__ = (
        CheckConstraint(
            "(movement_type IN ('DEPOSIT', 'TRADE_RETURN') AND amount > 0) OR "
            "(movement_type IN ('WITHDRAWAL', 'TRADE_MARGIN') AND amount < 0) OR "
            "(movement_type = 'TRADE_PROFIT' AND amount != 0)",
            name="ck_account_movements_signed_amount",
        ),
        Index("ix_account_movements_account_occurred", "account_id", "occurred_at"),
    )

    def __repr__(self) -> str:
        return (
            f"<AccountMovement id={self.id} account={self.account_id} "
            f"type={self.movement_type} amount={self.amount}>"
        )


__all__ = ["AccountMovement", "AccountMovementType"]
