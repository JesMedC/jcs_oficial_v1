"""Subscription schemas — request/response.

Todas las mutaciones de Subscription pasan por ``app.services.subscription_service``
(R3). Las rutas sólo validan con Pydantic (R1) y llaman al servicio.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.models.subscription import SubscriptionStatus, SubscriptionTier


class SubscriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    workspace_id: uuid.UUID
    tier: SubscriptionTier
    status: SubscriptionStatus
    current_period_start: datetime
    current_period_end: datetime
    mp_subscription_id: str | None = None
    mp_preapproval_id: str | None = None
    created_at: datetime
    updated_at: datetime


# Los tiers válidos para ``/upgrade`` — excluye STARTER porque es el trial
# que se crea automáticamente al registrarse.
UpgradeTier = Literal["PLUS", "ELITE"]


class UpgradeIn(BaseModel):
    """Body para ``POST /api/v1/subscriptions/upgrade``.

    Restringimos a ``PLUS`` y ``ELITE`` porque el trial Starter es lo que
    se crea en el register; subir a Starter no tendría efecto.
    ``STARTER`` se rechaza con 422 (VALIDATION_ERROR).
    """

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    tier: UpgradeTier


class UpgradeOut(BaseModel):
    """Body de respuesta — checkout_url + preference_id de MercadoPago.

    Mientras la integración real no esté cableada (p0c), el endpoint
    devuelve placeholders para que el frontend pueda construir la UX
    end-to-end sin tocar el backend de nuevo.
    """

    checkout_url: str
    mp_preference_id: str


class CancelOut(BaseModel):
    """Body de respuesta al cancelar."""

    subscription_id: uuid.UUID
    tier: SubscriptionTier
    status: SubscriptionStatus
    canceled_at: datetime
