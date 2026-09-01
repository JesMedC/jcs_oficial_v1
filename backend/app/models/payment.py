"""Payment model — registro de pagos de MercadoPago.

p0c: una fila por cada ``payment`` que MercadoPago nos reporta. El
``mp_payment_id`` es único (es el ``id`` que devuelve MP en el payload
del webhook). El resto de columnas es un snapshot del momento del
pago — la fuente de verdad de MP está siempre disponible vía
``GET /v1/payments/{id}`` (ver ``MercadoPagoClient.get_payment``).

Status enum:
- ``PENDING`` — esperando confirmación (webhook ``payment.pending``).
- ``APPROVED`` — pago confirmado (webhook ``payment.created`` cuando
  ``status=approved``).
- ``REJECTED`` — rechazado por MP o por el emisor.
- ``CANCELLED`` — cancelado por el usuario o por nosotros.
- ``REFUNDED`` — devuelto (futuro; todavía no se usa).
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.subscription import Subscription
    from app.models.user import User


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"


class Payment(Base, TimestampMixin):
    __tablename__ = "payments"

    # ``mp_payment_id`` tiene UNIQUE — el índice único lo define
    # explícitamente ``__table_args__`` para tener un nombre estable.
    mp_payment_id: Mapped[str] = mapped_column(
        String(80), nullable=False
    )
    # ``user_id`` se cubre con el índice compuesto ``ix_payments_user_status``.
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    # ``subscription_id`` se cubre con ``ix_payments_subscription_id``.
    subscription_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subscriptions.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
    )
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(
            PaymentStatus,
            name="payment_status",
            values_callable=lambda enum: [m.value for m in enum],
        ),
        nullable=False,
    )
    amount_usd: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    payer_email: Mapped[str] = mapped_column(String(254), nullable=False)
    # ``date_created`` que devuelve MP — preservado para auditoría.
    mp_created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    user: Mapped["User"] = relationship()
    subscription: Mapped["Subscription | None"] = relationship()

    __table_args__ = (
        Index("ix_payments_user_status", "user_id", "status"),
        Index("ix_payments_subscription_id", "subscription_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<Payment id={self.id} mp_id={self.mp_payment_id} "
            f"status={self.status} amount={self.amount_usd}>"
        )


__all__ = ["Payment", "PaymentStatus"]