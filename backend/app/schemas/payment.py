"""Payment schemas — admin + user-facing.

p0c: ``PaymentOut`` es la fila cruda del modelo ``Payment``. La usamos
tanto en el endpoint admin (``GET /api/v1/admin/payments``) como en el
detalle que eventualmente verá el propio usuario. ``PaymentListOut``
es el sobre paginado para el endpoint admin.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models import PaymentStatus


class PaymentOut(BaseModel):
    """Snapshot de un pago reportado por MercadoPago."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    mp_payment_id: str
    user_id: uuid.UUID
    subscription_id: uuid.UUID | None = None
    status: PaymentStatus
    amount_usd: Decimal
    payer_email: str
    mp_created_at: datetime
    created_at: datetime
    updated_at: datetime


class PaymentListOut(BaseModel):
    """Paginated envelope for ``GET /api/v1/admin/payments``."""

    items: list[PaymentOut]
    total: int
    skip: int
    limit: int


__all__ = ["PaymentOut", "PaymentListOut"]