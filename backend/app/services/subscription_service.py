"""Subscription service — queries + mutations del modelo ``Subscription``.

p0b.1a implementa:
- ``get_user_active_subscription`` — última sub del usuario (la "vigente").
- ``create_trial`` — suscripción STARTER / TRIAL de 7 días.
- ``upgrade_subscription`` — devuelve un checkout_url + preference_id de
  MercadoPago. La integración real se cablea en p0c.
- ``process_mp_webhook`` — STUB; sólo loguea.
- ``is_trial_active`` / ``is_subscription_active`` — predicados.

Todas las mutaciones emiten ``AuditLog`` (R3 Reliability).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    AuditLog,
    PlanTierPrice,
    Subscription,
    SubscriptionStatus,
    SubscriptionTier,
    User,
    Workspace,
)
from app.observability.logging import get_logger

log = get_logger(__name__)

TRIAL_PERIOD_DAYS = 7


class SubscriptionError(Exception):
    """Error de subscripción traducible a ``ErrorEnvelope``."""

    def __init__(self, code: str, message: str, status: int = 400) -> None:
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)


# ---------- predicates ----------
def is_trial_active(subscription: Subscription | None) -> bool:
    """True si la sub existe, está en TRIAL y la fecha de fin es futura."""
    if subscription is None:
        return False
    if subscription.status != SubscriptionStatus.TRIAL:
        return False
    end = subscription.current_period_end
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    return end > datetime.now(timezone.utc)


def is_subscription_active(subscription: Subscription | None) -> bool:
    """True si la sub está activa (TRIAL o ACTIVE con periodo vigente)."""
    if subscription is None:
        return False
    if subscription.status not in (SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE):
        return False
    end = subscription.current_period_end
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    return end > datetime.now(timezone.utc)


# ---------- queries ----------
async def get_user_active_subscription(
    db: AsyncSession, user_id: uuid.UUID
) -> Subscription | None:
    """Última sub del usuario (ordenada por created_at desc).

    No filtra por status — el caller decide. Devuelve ``None`` si el
    usuario no tiene subscripciones todavía.
    """
    stmt = (
        select(Subscription)
        .where(Subscription.user_id == user_id)
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    return await db.scalar(stmt)


async def get_workspace_active_subscription(
    db: AsyncSession, workspace_id: uuid.UUID
) -> Subscription | None:
    stmt = (
        select(Subscription)
        .where(Subscription.workspace_id == workspace_id)
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    return await db.scalar(stmt)


# ---------- mutations ----------
async def _emit_audit(
    db: AsyncSession,
    *,
    actor_user_id: uuid.UUID,
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
            entity_type="Subscription",
            entity_id=entity_id,
            previous_value=previous,
            new_value=new,
            correlation_id=correlation_id,
        )
    )
    await db.flush()


async def create_trial(
    db: AsyncSession,
    *,
    user: User,
    workspace: Workspace,
    correlation_id: str | None = None,
) -> Subscription:
    """Crea una suscripción de prueba STARTER / TRIAL de 7 días.

    Idempotente en el sentido de "no duplica": si el usuario ya tiene una
    TRIAL activa, devuelve la existente. Llamado por ``auth_service``.
    """
    existing = await get_user_active_subscription(db, user.id)
    if existing is not None and existing.status == SubscriptionStatus.TRIAL:
        return existing

    now = datetime.now(timezone.utc)
    period_end = now + timedelta(days=TRIAL_PERIOD_DAYS)
    sub = Subscription(
        user_id=user.id,
        workspace_id=workspace.id,
        tier=SubscriptionTier.STARTER,
        status=SubscriptionStatus.TRIAL,
        current_period_start=now,
        current_period_end=period_end,
    )
    db.add(sub)
    await db.flush()

    await _emit_audit(
        db,
        actor_user_id=user.id,
        action="subscription.trial.create",
        entity_id=str(sub.id),
        previous=None,
        new={
            "tier": sub.tier.value,
            "status": sub.status.value,
            "current_period_end": sub.current_period_end.isoformat(),
        },
        correlation_id=correlation_id,
    )
    return sub


async def upgrade_subscription(
    db: AsyncSession,
    *,
    user: User,
    workspace: Workspace,
    target_tier: SubscriptionTier,
    correlation_id: str | None = None,
) -> dict[str, str]:
    """Stub de upgrade — devuelve ``{checkout_url, mp_preference_id}``.

    p0b.1a STUBEA la llamada real a MercadoPago. Cuando se cablee
    (p0c), aquí vivirá el POST ``/checkout/preferences`` con el SDK.

    Por ahora: si la sub actual ya es del mismo tier y está vigente,
    no crea nueva sub y devuelve un placeholder "no-op". Si la sub
    está cancelada o expirada, crea una nueva sub ``ACTIVE`` con
    periodo de 30 días.
    """
    now = datetime.now(timezone.utc)
    existing = await get_user_active_subscription(db, user.id)

    # Invalidamos la sub actual para reemplazarla (modelamos "upgrade"
    # como reemplazar la vigente). En un sistema real esto se haría
    # en MP y el webhook confirmaría.
    if existing is not None and is_subscription_active(existing):
        existing.status = SubscriptionStatus.CANCELED
        existing.current_period_end = now
        await db.flush()
        await _emit_audit(
            db,
            actor_user_id=user.id,
            action="subscription.cancel.previous",
            entity_id=str(existing.id),
            previous={
                "tier": existing.tier.value,
                "status": existing.status.value,
            },
            new=None,
            correlation_id=correlation_id,
        )

    # Nueva sub ACTIVE (provisional hasta que el webhook confirme).
    period_end = now + timedelta(days=30)
    new_sub = Subscription(
        user_id=user.id,
        workspace_id=workspace.id,
        tier=target_tier,
        status=SubscriptionStatus.ACTIVE,
        current_period_start=now,
        current_period_end=period_end,
    )
    db.add(new_sub)
    await db.flush()

    await _emit_audit(
        db,
        actor_user_id=user.id,
        action="subscription.upgrade.requested",
        entity_id=str(new_sub.id),
        previous=None,
        new={
            "tier": new_sub.tier.value,
            "status": new_sub.status.value,
            "target_tier": target_tier.value,
        },
        correlation_id=correlation_id,
    )
    await db.commit()
    await db.refresh(new_sub)

    # Por ahora sin invoice real — usamos placeholders.
    placeholder_preference = f"PLACEHOLDER_{uuid.uuid4().hex[:24]}"
    checkout_url = (
        f"https://www.mercadopago.com/checkout/v1/redirect"
        f"?pref_id={placeholder_preference}"
    )
    return {
        "checkout_url": checkout_url,
        "mp_preference_id": placeholder_preference,
    }


async def cancel_subscription(
    db: AsyncSession,
    *,
    user: User,
    correlation_id: str | None = None,
) -> Subscription:
    """Marca la suscripción actual del usuario como ``CANCELED``.

    Lanza ``SubscriptionError`` si no hay sub o ya está cancelada.
    """
    existing = await get_user_active_subscription(db, user.id)
    if existing is None:
        raise SubscriptionError(
            code="SUBSCRIPTION_NOT_FOUND",
            message="No hay suscripcion activa",
            status=404,
        )
    if existing.status == SubscriptionStatus.CANCELED:
        raise SubscriptionError(
            code="SUBSCRIPTION_ALREADY_CANCELED",
            message="La suscripcion ya esta cancelada",
            status=409,
        )

    now = datetime.now(timezone.utc)
    previous_status = existing.status
    existing.status = SubscriptionStatus.CANCELED
    existing.current_period_end = now
    await db.flush()

    await _emit_audit(
        db,
        actor_user_id=user.id,
        action="subscription.cancel",
        entity_id=str(existing.id),
        previous={"status": previous_status.value},
        new={"status": existing.status.value},
        correlation_id=correlation_id,
    )
    await db.commit()
    await db.refresh(existing)
    return existing


async def process_mp_webhook(
    db: AsyncSession, *, payload: dict[str, Any]
) -> None:
    """STUB — procesa el webhook de MercadoPago.

    En p0c leeremos ``payload['data']['id']`` y cruzaremos con el
    ``mp_preapproval_id`` de la sub. Por ahora sólo logueamos.
    """
    log.info(
        "mp_webhook.stub",
        event=payload.get("type") or payload.get("action") or "unknown",
        keys=list(payload.keys()),
    )


__all__ = [
    "SubscriptionError",
    "TRIAL_PERIOD_DAYS",
    "is_trial_active",
    "is_subscription_active",
    "get_user_active_subscription",
    "get_workspace_active_subscription",
    "create_trial",
    "upgrade_subscription",
    "cancel_subscription",
    "process_mp_webhook",
]
