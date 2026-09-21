"""Subscription schemas — request/response.

Todas las mutaciones de Subscription pasan por ``app.services.subscription_service``
(R3). Las rutas sólo validan con Pydantic (R1) y llaman al servicio.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, model_validator

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

    p0c: ahora el cliente puede pasar ``success_url`` / ``failure_url`` /
    ``pending_url`` — son las ``back_urls`` que MercadoPago usará para
    redirigir al usuario tras el checkout. Si no las pasa, el backend
    las construye desde ``Settings.frontend_base_url``.
    """

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    tier: UpgradeTier
    success_url: AnyHttpUrl | None = None
    failure_url: AnyHttpUrl | None = None
    pending_url: AnyHttpUrl | None = None

    @model_validator(mode="after")
    def _at_least_no_urls(self) -> "UpgradeIn":
        # Nada que validar explícitamente — Pydantic ya rechaza los
        # strings no-URL via ``AnyHttpUrl``. El hook existe para que el
        # validador tenga un único lugar donde extender reglas (ej.
        # exigir que los 3 estén o ninguno).
        return self


class UpgradeOut(BaseModel):
    """Body de respuesta — checkout_url + preference_id de MercadoPago.

    p0c: ``checkout_url`` apunta al ``init_point`` (prod) o
    ``sandbox_init_point`` (dev) de la preference recién creada.
    ``mp_preference_id`` es el ID que MercadoPago nos devolvió — el
    frontend lo usa para armar ``/payment/success?ref=<pref_id>``.
    """

    checkout_url: str
    mp_preference_id: str


class CancelOut(BaseModel):
    """Body de respuesta al cancelar."""

    subscription_id: uuid.UUID
    tier: SubscriptionTier
    status: SubscriptionStatus
    canceled_at: datetime
