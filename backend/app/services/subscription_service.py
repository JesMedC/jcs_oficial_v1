"""Subscription service — queries + mutations del modelo ``Subscription``.

p0c integra MercadoPago de verdad. El flujo es:

1. ``upgrade_subscription`` crea la preference en MP vía
   ``MercadoPagoClient.create_preference``. La sub sigue siendo ACTIVE
   provisional — el webhook la confirma o cancela.
2. ``process_mp_webhook`` ahora persiste la ``Payment`` + actualiza
   la ``Subscription`` correspondiente (idempotente vía
   ``mp_payment_id``).

Todas las mutaciones emiten ``AuditLog`` (R3 Reliability).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from pydantic import AnyHttpUrl
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.integrations import MercadoPagoClient, MercadoPagoConfigError
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
PAID_PERIOD_DAYS = 30


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
    """Última sub del usuario (ordenada por created_at desc)."""
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


async def _get_active_price_for_tier(
    db: AsyncSession, tier: SubscriptionTier
) -> PlanTierPrice | None:
    stmt = (
        select(PlanTierPrice)
        .where(
            PlanTierPrice.tier == tier,
            PlanTierPrice.is_active.is_(True),
            PlanTierPrice.effective_until.is_(None),
        )
        .order_by(PlanTierPrice.effective_from.desc())
        .limit(1)
    )
    return await db.scalar(stmt)


def _build_default_urls(
    settings: Settings,
) -> tuple[AnyHttpUrl, AnyHttpUrl, AnyHttpUrl]:
    """Construye las back_urls usando ``frontend_base_url``.

    Se usan cuando el cliente no las provee en el body del ``/upgrade``.
    No agregamos query params propios: MercadoPago inyecta los suyos al
    redirigir (``payment_id``, ``status``, ``preference_id``,
    ``external_reference``), que es lo que las páginas de callback leen.
    """
    base = settings.frontend_base_url.rstrip("/")
    success = f"{base}/payment/success"
    failure = f"{base}/payment/failure"
    pending = f"{base}/payment/success"
    return (
        AnyHttpUrl(success),
        AnyHttpUrl(failure),
        AnyHttpUrl(pending),
    )


async def upgrade_subscription(
    db: AsyncSession,
    *,
    user: User,
    workspace: Workspace,
    target_tier: SubscriptionTier,
    success_url: AnyHttpUrl | None = None,
    failure_url: AnyHttpUrl | None = None,
    pending_url: AnyHttpUrl | None = None,
    correlation_id: str | None = None,
) -> dict[str, str]:
    """Inicia un upgrade creando una preference real en MercadoPago.

    Pasos:

    1. Lee el precio activo del ``target_tier`` en ``plan_tier_prices``.
       Si no hay precio configurado, devuelve ``PRICE_NOT_CONFIGURED``
       (422).
    2. Cancela la sub vigente (si la hay) para que el webhook confirme
       el nuevo tier en lugar de duplicar periodos.
    3. Crea la nueva ``Subscription`` en ``PENDING_UPGRADE`` — usamos
       ``ACTIVE`` provisional con un marcador interno: el webhook la
       actualiza. Para mantener el contrato existente, la creamos
       ``ACTIVE`` pero con ``mp_preapproval_id`` aún NULL hasta que el
       webhook corra.
    4. Llama a ``MercadoPagoClient.create_preference`` y devuelve el
       ``init_point`` (o ``sandbox_init_point`` en dev) como
       ``checkout_url``.

    Devuelve ``{checkout_url, mp_preference_id}`` para el frontend.

    Lanza ``SubscriptionError(MP_NOT_CONFIGURED)`` si el SDK no está
    configurado — la ruta lo traduce a 422 con un mensaje claro (nunca
    devolvemos un placeholder URL).
    """
    settings = get_settings()
    mp = MercadoPagoClient(settings)

    if not mp.configured:
        raise SubscriptionError(
            code="MP_NOT_CONFIGURED",
            message=(
                "MERCADOPAGO_ACCESS_TOKEN no esta configurado. "
                "Pedile al admin que agregue el token antes de cobrar."
            ),
            status=422,
        )

    price_row = await _get_active_price_for_tier(db, target_tier)
    if price_row is None:
        raise SubscriptionError(
            code="PRICE_NOT_CONFIGURED",
            message=f"No hay precio activo configurado para el tier {target_tier.value}",
            status=422,
        )

    # Generamos un ``external_reference`` que el webhook pueda parsear
    # para encontrar la sub. La forma es estable: ``subscription:<uid>:<wid>:<tier>``.
    external_reference = f"subscription:{user.id}:{workspace.id}:{target_tier.value}"

    # Construimos las back_urls. Si el cliente las pasó, las usamos tal
    # cual. Si no, las armamos desde ``frontend_base_url``. Llamamos
    # igual aunque ya tengamos el external_reference — la ``pref_id`` la
    # pega MP al redirigir (no la necesitamos acá).
    if success_url is None or failure_url is None or pending_url is None:
        # Armamos defaults sin query params: MP inyecta ``payment_id``
        # y compañía al redirigir (ver docstring de ``_build_default_urls``).
        default_success, default_failure, default_pending = _build_default_urls(settings)
        success_url = success_url or default_success
        failure_url = failure_url or default_failure
        pending_url = pending_url or default_pending

    # Cancelamos la sub vigente para que el webhook no se confunda con
    # una renovación. El manejo "duplicate active" lo hace el caller si
    # lo necesita.
    now = datetime.now(timezone.utc)
    existing = await get_user_active_subscription(db, user.id)
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

    # Creamos la nueva Subscription como ACTIVE provisional. La fuente
    # de verdad es MP — el webhook la actualizará (o la cancelará si el
    # pago falla). Guardamos también la ``external_reference`` en la
    # fila para auditoría (el campo se ignora si no existe — pero como
    # no lo agregamos al modelo, lo dejamos como marcador del flujo en
    # el AuditLog).
    new_sub = Subscription(
        user_id=user.id,
        workspace_id=workspace.id,
        tier=target_tier,
        status=SubscriptionStatus.ACTIVE,
        current_period_start=now,
        current_period_end=now + timedelta(days=PAID_PERIOD_DAYS),
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
            "external_reference": external_reference,
        },
        correlation_id=correlation_id,
    )

    # Llamada real a MercadoPago.
    try:
        preference = await mp.create_preference(
            title=f"JadeCapitalSuite {target_tier.value.title()} — 30",
            price_usd=Decimal(str(price_row.price_usd)),
            success_url=success_url,
            failure_url=failure_url,
            pending_url=pending_url,
            external_reference=external_reference,
            payer_email=user.email,
        )
    except MercadoPagoConfigError as exc:
        # El SDK falló — marcamos la sub como CANCELED para no dejarla
        # fantasma y propagamos el error.
        new_sub.status = SubscriptionStatus.CANCELED
        await db.flush()
        raise SubscriptionError(
            code="MP_NOT_CONFIGURED",
            message=str(exc),
            status=422,
        ) from exc

    await db.commit()
    await db.refresh(new_sub)

    # Pick init_point vs sandbox según entorno.
    init_point = preference["sandbox_init_point"] if mp.sandbox else preference["init_point"]
    # Fallback al init_point real si el sandbox viene vacío.
    if init_point == "":
        init_point = preference["init_point"]

    return {
        "checkout_url": init_point,
        "mp_preference_id": preference["preference_id"],
    }


async def cancel_subscription(
    db: AsyncSession,
    *,
    user: User,
    correlation_id: str | None = None,
) -> Subscription:
    """Marca la suscripción actual del usuario como ``CANCELED``."""
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
    db: AsyncSession,
    *,
    payment_payload: dict[str, Any],
    correlation_id: str | None = None,
) -> str:
    """Procesa el payload de un webhook de MercadoPago.

    Devuelve ``"ok"`` si lo procesó (aprobado o rechazado) o
    ``"ignored"`` si el ``external_reference`` no matchea el patrón
    conocido (p.ej. webhook de otro producto).

    Pasos:

    1. Parsea ``external_reference`` (formato
       ``subscription:<user_id>:<workspace_id>:<tier>``).
    2. Si no matchea, devuelve ``"ignored"``.
    3. Lee la Subscription del usuario (la última).
    4. Mapea ``payment.status`` (``approved`` / ``rejected`` /
       ``cancelled``) a nuestro enum ``PaymentStatus``.
    5. Carga/actualiza la ``Payment`` (idempotente vía
       ``mp_payment_id``).
    6. Si ``approved``, upgrade la Subscription (status=ACTIVE, periodo
       nuevo, ``mp_subscription_id``).
    7. Si ``rejected`` / ``cancelled``, marca la Subscription como
       CANCELED.

    Este servicio NO valida la firma — eso lo hace la ruta antes de
    llamar aquí.
    """
    external_reference = payment_payload.get("external_reference") or ""
    if not external_reference.startswith("subscription:"):
        log.info(
            "mp_webhook.ignored",
            extra={"external_reference": external_reference},
        )
        return "ignored"

    try:
        _, user_id_str, _workspace_id_str, tier_str = external_reference.split(":")
        user_id = uuid.UUID(user_id_str)
    except (ValueError, IndexError) as exc:
        log.warning(
            "mp_webhook.bad_external_reference",
            extra={"external_reference": external_reference},
        )
        raise SubscriptionError(
            code="MP_BAD_EXTERNAL_REFERENCE",
            message=f"external_reference invalido: {external_reference!r}",
            status=400,
        ) from exc

    # Mapeo de status de MP a nuestro enum.
    raw_status = str(payment_payload.get("status") or "").lower()
    status_map = {
        "approved": "APPROVED",
        "rejected": "REJECTED",
        "cancelled": "CANCELLED",
        "refunded": "REFUNDED",
    }
    if raw_status not in status_map:
        # MP puede mandar ``pending`` / ``in_process`` / etc. — los
        # ignoramos por ahora (los contaremos como PENDING en el
        # próximo webhook).
        log.info(
            "mp_webhook.pending",
            extra={"raw_status": raw_status},
        )
        return "ignored"

    status_value = status_map[raw_status]

    # Importación local para evitar ciclo.
    from app.models import Payment, PaymentStatus
    from app.services.payment_service import record_payment

    mp_payment_id = str(payment_payload.get("id") or "")
    amount_usd = Decimal(str(payment_payload.get("transaction_amount") or "0"))
    payer_email = str((payment_payload.get("payer") or {}).get("email") or "")
    mp_created_at_raw = payment_payload.get("date_created")
    if isinstance(mp_created_at_raw, str):
        mp_created_at = datetime.fromisoformat(mp_created_at_raw.replace("Z", "+00:00"))
    elif isinstance(mp_created_at_raw, datetime):
        mp_created_at = mp_created_at_raw
    else:
        mp_created_at = datetime.now(timezone.utc)

    # 1. Aseguramos que existe la Payment (idempotente).
    sub = await get_user_active_subscription(db, user_id)
    payment = await record_payment(
        db,
        mp_payment_id=mp_payment_id,
        user_id=user_id,
        subscription_id=sub.id if sub is not None else None,
        status=PaymentStatus(status_value),
        amount_usd=amount_usd,
        payer_email=payer_email,
        mp_created_at=mp_created_at,
        correlation_id=correlation_id,
    )

    # 2. Actualizamos la sub según el status.
    if sub is None:
        log.warning(
            "mp_webhook.no_subscription",
            extra={"user_id": str(user_id)},
        )
        return "ok"

    if status_value == "APPROVED":
        # El webhook confirma el upgrade. Renovamos el periodo y
        # guardamos el mp_payment_id en la sub.
        previous_status = sub.status
        previous_tier = sub.tier
        now = datetime.now(timezone.utc)
        sub.status = SubscriptionStatus.ACTIVE
        sub.mp_subscription_id = mp_payment_id
        sub.current_period_start = now
        sub.current_period_end = now + timedelta(days=PAID_PERIOD_DAYS)
        # Si la tier del external_reference difiere, la actualizamos.
        try:
            target = SubscriptionTier(tier_str)
            if sub.tier != target:
                sub.tier = target
        except ValueError:
            pass
        await db.flush()

        await _emit_audit(
            db,
            actor_user_id=user_id,
            action="subscription.upgrade.confirmed",
            entity_id=str(sub.id),
            previous={"status": previous_status.value, "tier": previous_tier.value},
            new={
                "status": sub.status.value,
                "tier": sub.tier.value,
                "mp_payment_id": mp_payment_id,
            },
            correlation_id=correlation_id,
        )
    elif status_value in ("REJECTED", "CANCELLED"):
        previous_status = sub.status
        sub.status = SubscriptionStatus.CANCELED
        await db.flush()

        await _emit_audit(
            db,
            actor_user_id=user_id,
            action=f"subscription.payment.{status_value.lower()}",
            entity_id=str(sub.id),
            previous={"status": previous_status.value},
            new={"status": sub.status.value, "mp_payment_id": mp_payment_id},
            correlation_id=correlation_id,
        )

    await db.commit()
    return "ok"


__all__ = [
    "SubscriptionError",
    "TRIAL_PERIOD_DAYS",
    "PAID_PERIOD_DAYS",
    "is_trial_active",
    "is_subscription_active",
    "get_user_active_subscription",
    "get_workspace_active_subscription",
    "create_trial",
    "upgrade_subscription",
    "cancel_subscription",
    "process_mp_webhook",
]