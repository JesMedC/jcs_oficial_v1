"""Payment service — queries + mutations del modelo ``Payment``.

p0c: el flujo real es:

1. ``upgrade_subscription`` crea un Subscription ACTIVE provisional y
   llama a MercadoPago para crear la preference. La preference vive en
   MP, no en nuestra DB.
2. MP nos notifica via webhook (``POST /api/v1/webhooks/mercadopago``).
3. El handler llama a ``record_payment`` + ``update_payment_status``
   para materializar el Payment + actualizar la Subscription.

Los métodos expuestos son ``record_payment``, ``get_user_payments``,
``get_all_payments`` (admin) y ``update_payment_status``. Todos emiten
``AuditLog`` cuando mutan.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    AuditLog,
    Payment,
    PaymentStatus,
    Subscription,
    User,
)
from app.observability.logging import get_logger

log = get_logger(__name__)


class PaymentError(Exception):
    """Error de pagos traducible a ``ErrorEnvelope``."""

    def __init__(self, code: str, message: str, status: int = 400) -> None:
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)


# ---------- emit helper ----------
async def _emit_audit(
    db: AsyncSession,
    *,
    actor_user_id: uuid.UUID | None,
    action: str,
    entity_id: str,
    previous: dict[str, Any] | None,
    new: dict[str, Any] | None,
    correlation_id: str | None = None,
) -> None:
    db.add(
        AuditLog(
            actor_user_id=actor_user_id,
            action=action,
            entity_type="Payment",
            entity_id=entity_id,
            previous_value=previous,
            new_value=new,
            correlation_id=correlation_id,
        )
    )
    await db.flush()


# ---------- mutations ----------
async def record_payment(
    db: AsyncSession,
    *,
    mp_payment_id: str,
    user_id: uuid.UUID,
    subscription_id: uuid.UUID | None,
    status: PaymentStatus,
    amount_usd: Decimal,
    payer_email: str,
    mp_created_at: datetime,
    correlation_id: str | None = None,
) -> Payment:
    """Crea un Payment. Si el ``mp_payment_id`` ya existe, lo carga.

    Idempotente: el mismo webhook procesado dos veces no crea duplicados.
    Devuelve siempre la fila canónica.
    """
    existing = await db.scalar(
        select(Payment).where(Payment.mp_payment_id == mp_payment_id)
    )
    if existing is not None:
        log.info(
            "payment.duplicate",
            extra={"mp_payment_id": mp_payment_id, "payment_id": str(existing.id)},
        )
        return existing

    payment = Payment(
        mp_payment_id=mp_payment_id,
        user_id=user_id,
        subscription_id=subscription_id,
        status=status,
        amount_usd=amount_usd,
        payer_email=payer_email,
        mp_created_at=mp_created_at,
    )
    db.add(payment)
    try:
        await db.flush()
    except IntegrityError:
        # Race: otro worker insertó primero. Releemos y devolvemos esa fila.
        await db.rollback()
        existing = await db.scalar(
            select(Payment).where(Payment.mp_payment_id == mp_payment_id)
        )
        if existing is None:
            raise
        return existing

    await _emit_audit(
        db,
        actor_user_id=user_id,
        action="payment.record",
        entity_id=str(payment.id),
        previous=None,
        new={
            "mp_payment_id": mp_payment_id,
            "status": status.value,
            "amount_usd": str(amount_usd),
        },
        correlation_id=correlation_id,
    )
    return payment


async def update_payment_status(
    db: AsyncSession,
    payment: Payment,
    new_status: PaymentStatus,
    correlation_id: str | None = None,
) -> Payment:
    """Actualiza el status de un Payment existente.

    Emite ``AuditLog`` con el cambio de estado. Idempotente: si el
    status nuevo coincide con el viejo, no emite audit.
    """
    if payment.status == new_status:
        return payment

    previous_status = payment.status
    payment.status = new_status
    await db.flush()

    await _emit_audit(
        db,
        actor_user_id=payment.user_id,
        action="payment.status_update",
        entity_id=str(payment.id),
        previous={"status": previous_status.value},
        new={"status": new_status.value},
        correlation_id=correlation_id,
    )
    return payment


# ---------- queries ----------
async def get_payment_by_mp_id(
    db: AsyncSession, mp_payment_id: str
) -> Payment | None:
    return await db.scalar(
        select(Payment).where(Payment.mp_payment_id == mp_payment_id)
    )


async def get_user_payments(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[Payment], int]:
    """Lista paginada de pagos del usuario + total."""
    base = (
        select(Payment)
        .where(Payment.user_id == user_id)
        .order_by(Payment.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    count_stmt = (
        select(func.count())
        .select_from(Payment)
        .where(Payment.user_id == user_id)
    )
    rows = list((await db.execute(base)).scalars().all())
    total = await db.scalar(count_stmt) or 0
    return rows, int(total)


async def get_all_payments(
    db: AsyncSession,
    *,
    skip: int = 0,
    limit: int = 50,
    status_filter: PaymentStatus | None = None,
) -> tuple[list[Payment], int]:
    """Lista paginada de pagos (admin) + total."""
    base = select(Payment).order_by(Payment.created_at.desc())
    count_stmt = select(func.count()).select_from(Payment)

    if status_filter is not None:
        base = base.where(Payment.status == status_filter)
        count_stmt = count_stmt.where(Payment.status == status_filter)

    base = base.offset(skip).limit(limit)
    rows = list((await db.execute(base)).scalars().all())
    total = await db.scalar(count_stmt) or 0
    return rows, int(total)


# Re-exports for convenience.
__all__ = [
    "PaymentError",
    "record_payment",
    "update_payment_status",
    "get_payment_by_mp_id",
    "get_user_payments",
    "get_all_payments",
]


# Imported here for type-hinting — kept private to avoid a circular dep
# with subscription_service.
_ = (User, Subscription)