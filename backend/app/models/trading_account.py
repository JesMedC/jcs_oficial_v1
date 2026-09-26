"""TradingAccount model — cuentas de trading del workspace.

p0d.1: el usuario autenticado registra sus cuentas de trading
(Binary o Forex).
p0f.1 (multi-tenant pivot): la cuenta pasa a vivir a nivel
``Workspace``, no ``User``. El campo ``workspace_id`` se infiere del
``JWT`` del usuario actual al crear (ver
``trading_account_service.create_trading_account``) — el contrato del
API público no expone este campo en el body.

La columna ``user_id`` se conserva: marca al dueño original de la
cuenta (la unicidad ``user → trading_accounts`` sigue siendo
"una cuenta por (user_id, broker, name)" en términos prácticos).

Campos:
- ``user_id`` (FK CASCADE) — el dueño de la cuenta.
- ``workspace_id`` (FK CASCADE) — workspace dueño; se BORRA en
  cascada si el workspace desaparece.
- ``broker_name`` — el broker donde está abierta (ej. ``"Pocket Option"``).
- ``type`` — enum ``BINARY`` | ``FOREX``.
- ``name`` — nombre legible puesto por el usuario (ej. ``"Cuenta principal"``).
- ``balance_usd`` — arranca en 0; lo actualizará el módulo de
  sincronización de balances (futuro).

La API expone sólo ``GET /accounts`` (listar las del workspace del
usuario) y ``POST /accounts`` (crear). Sin delete/update por ahora.
"""
from __future__ import annotations

import enum
import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    Enum,
    ForeignKey,
    Index,
    Numeric,
    SmallInteger,
    String,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.workspace import Workspace


class TradingAccountType(str, enum.Enum):
    BINARY = "BINARY"
    FOREX = "FOREX"


class TradingAccount(Base, TimestampMixin):
    __tablename__ = "trading_accounts"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    broker_name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[TradingAccountType] = mapped_column(
        Enum(
            TradingAccountType,
            name="trading_account_type",
            values_callable=lambda enum: [m.value for m in enum],
        ),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    # ``balance_usd`` arranca en 0. Tiene default Python-side para que el
    # INSERT siempre incluya ``0`` (no NULL), más ``server_default=0`` en
    # la migración como red de seguridad para INSERTs crudos a la DB.
    balance_usd: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0")
    )
    # Per-account risk-control settings (REQ-RISK-PER-ACCOUNT). Moved
    # off ``Workspace`` so each account has its own session-ops cap and
    # percentage-loss thresholds; the discipline engine already buckets
    # trades per account, so the workspace columns were a forced coupling
    # between unrelated accounts.
    risk_control_mode: Mapped[str] = mapped_column(
        String(32),
        default="operations",
        server_default="operations",
        nullable=False,
    )
    session_ops_cap: Mapped[int | None] = mapped_column(
        SmallInteger, nullable=True
    )
    daily_loss_pct: Mapped[Decimal | None] = mapped_column(
        Numeric(6, 2), nullable=True
    )
    weekly_loss_pct: Mapped[Decimal | None] = mapped_column(
        Numeric(6, 2), nullable=True
    )
    monthly_loss_pct: Mapped[Decimal | None] = mapped_column(
        Numeric(6, 2), nullable=True
    )

    user: Mapped[User] = relationship()
    workspace: Mapped[Workspace] = relationship()

    __table_args__ = (
        Index("ix_trading_accounts_user_id", "user_id"),
        Index("ix_trading_accounts_workspace_id", "workspace_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<TradingAccount id={self.id} user={self.user_id} "
            f"ws={self.workspace_id} broker={self.broker_name!r} "
            f"type={self.type} name={self.name!r}>"
        )


__all__ = ["TradingAccount", "TradingAccountType"]
