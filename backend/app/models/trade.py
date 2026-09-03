"""Trade model — operaciones de trading del workspace.

p0e.4: un ``Trade`` es una operación atómica ``open → close`` sobre
una ``TradingAccount``.
p0f.1 (multi-tenant pivot): el ``Trade`` vive a nivel ``Workspace``
— el ``workspace_id`` se infiere del ``JWT`` del usuario actual al
abrir el trade (``trade_service.open_trade``). El ``user_id`` se
mantiene como autor original de la operación (preserva histórico y
permite queries de auditoría del tipo "qué trades abrió X").

Lifecycle (columna ``status``):
- ``OPEN`` — al crear, ``pnl_usd`` es NULL, ``closed_at`` es NULL.
- ``CLOSED_WIN | CLOSED_LOSS | CLOSED_BREAK`` — al cerrar, el service
  computa ``pnl_usd`` (que dispara ``balance_usd`` de la cuenta) y
  popula ``closed_at`` + ``r_multiple`` (FOREX).

Tipos (columna ``type``) — se acoplan al ``type`` de la cuenta:
- ``FOREX`` — populate campos forex-específicos + ``direction`` ∈
  {LONG, SHORT}.
- ``BINARY`` — populate campos binary-específicos + ``direction`` ∈
  {CALL, PUT}.

La columna ``direction`` es única (VARCHAR, no ENUM Postgres) porque
comparte valores entre tipos; el service layer valida la consistencia
con el ``type`` (ver ``trade_service.open_trade``).

``strategy_id`` queda nullable — el módulo D introducirá la tabla
``strategies`` en su propia migración (no se acopla acá).

Soft delete (``TimestampMixin.deleted_at``) para conservar historial
en ``audit_logs``; las queries del service filtran por
``deleted_at IS NULL``.
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.trading_account import TradingAccount
    from app.models.user import User
    from app.models.workspace import Workspace


class TradeType(str, enum.Enum):
    FOREX = "FOREX"
    BINARY = "BINARY"
    # FASE 4E — Deposit / withdrawal are written into the trades
    # table so the Operaciones tab can show a unified ledger
    # alongside FOREX/BINARY entries. The frontend filters them out
    # of the P&L/win-rate aggregations (they aren't trading
    # outcomes, they're capital movements), but they still show up
    # in the table so the user has a full audit trail.
    FUND = "FUND"
    WITHDRAW = "WITHDRAW"


class TradeStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED_WIN = "CLOSED_WIN"
    CLOSED_LOSS = "CLOSED_LOSS"
    CLOSED_BREAK = "CLOSED_BREAK"


class ForexDirection(str, enum.Enum):
    LONG = "LONG"
    SHORT = "SHORT"


class BinaryDirection(str, enum.Enum):
    CALL = "CALL"
    PUT = "PUT"


class Trade(Base, TimestampMixin):
    __tablename__ = "trades"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("trading_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    instrument: Mapped[str] = mapped_column(String(50), nullable=False)
    type: Mapped[TradeType] = mapped_column(
        Enum(
            TradeType,
            name="trade_type",
            values_callable=lambda enum: [m.value for m in enum],
        ),
        nullable=False,
    )
    status: Mapped[TradeStatus] = mapped_column(
        Enum(
            TradeStatus,
            name="trade_status",
            values_callable=lambda enum: [m.value for m in enum],
        ),
        nullable=False,
        default=TradeStatus.OPEN,
        server_default=TradeStatus.OPEN.value,
    )
    opened_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    closed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )

    # --- strategies (módulo D): FK pendiente, columna reservada ---
    strategy_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )

    # --- common journal fields ---
    emotional_tags: Mapped[Optional[list[str]]] = mapped_column(
        JSON, nullable=True
    )
    pre_trade_notes: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    post_trade_notes: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    followed_plan: Mapped[Optional[bool]] = mapped_column(
        Boolean, nullable=True
    )
    mistakes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    screenshots: Mapped[Optional[list[Any]]] = mapped_column(
        JSON, nullable=True
    )

    # --- FOREX-specific (nullable; service valida consistencia con type) ---
    pair: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    lot_size: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 4), nullable=True
    )
    # VARCHAR compartido: FOREX ∈ {LONG, SHORT}, BINARY ∈ {CALL, PUT}.
    direction: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    entry_price: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(20, 8), nullable=True
    )
    stop_loss: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(20, 8), nullable=True
    )
    take_profit: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(20, 8), nullable=True
    )
    exit_price: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(20, 8), nullable=True
    )
    pnl_usd: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    risk_amount_usd: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    risk_pct: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(6, 2), nullable=True
    )
    r_multiple: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(6, 2), nullable=True
    )

    # --- BINARY-specific ---
    investment_usd: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 2), nullable=True
    )
    payout_pct: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 2), nullable=True
    )
    expiration_seconds: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )

    user: Mapped["User"] = relationship()
    account: Mapped["TradingAccount"] = relationship()
    workspace: Mapped["Workspace"] = relationship()

    __table_args__ = (
        # Multi-tenant: ``(workspace_id, status)`` y
        # ``(workspace_id, opened_at desc)`` son los índices primarios
        # para las queries del módulo (las rutas filtran por
        # workspace — derivable del JWT — y por status / cronología).
        Index("ix_trades_workspace_status", "workspace_id", "status"),
        Index("ix_trades_workspace_opened", "workspace_id"),
        # ``ix_trades_account_opened`` se conserva: la query
        # "todas las trades de una cuenta específica dentro del
        # workspace" sigue siendo relevante.
        Index("ix_trades_account_opened", "account_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<Trade id={self.id} user={self.user_id} ws={self.workspace_id} "
            f"account={self.account_id} type={self.type} "
            f"status={self.status} instrument={self.instrument!r}>"
        )


__all__ = [
    "Trade",
    "TradeType",
    "TradeStatus",
    "ForexDirection",
    "BinaryDirection",
]
