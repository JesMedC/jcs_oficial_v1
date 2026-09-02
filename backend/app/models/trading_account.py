"""TradingAccount model — cuentas de trading del usuario.

p0d.1: cada usuario autenticado puede registrar sus cuentas de trading
(Binary o Forex). El modelo vive a nivel ``User`` (no ``Workspace``)
porque el dominio de trading es personal: una cuenta de Binary está
asociada al trader, no al espacio de trabajo.

Campos:
- ``user_id`` (FK CASCADE) — el dueño de la cuenta.
- ``broker_name`` — el broker donde está abierta (ej. ``"Pocket Option"``).
- ``type`` — enum ``BINARY`` | ``FOREX``.
- ``name`` — nombre legible puesto por el usuario (ej. ``"Cuenta principal"``).
- ``balance_usd`` — arranca en 0; lo actualizará el módulo de
  sincronización de balances (futuro).

La API expone sólo ``GET /accounts`` (listar las del usuario) y
``POST /accounts`` (crear). Sin delete/update por ahora.
"""
from __future__ import annotations

import enum
import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, Index, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


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

    user: Mapped["User"] = relationship()

    __table_args__ = (
        Index("ix_trading_accounts_user_id", "user_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<TradingAccount id={self.id} user={self.user_id} "
            f"broker={self.broker_name!r} type={self.type} name={self.name!r}>"
        )


__all__ = ["TradingAccount", "TradingAccountType"]
