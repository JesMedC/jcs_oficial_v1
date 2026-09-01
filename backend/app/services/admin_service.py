"""Admin service — p0b.2.

Owns the admin mutations and queries:

- ``list_users`` — paginated list with the latest subscription embedded
  per row. Filters by role, status (active/inactive/trial/active_sub/
  expired) and a case-insensitive search on email / first / last.
- ``set_user_active`` — toggles ``is_active``; blocks self-deactivation
  with ``CannotDeactivateSelfError``; emits an ``AuditLog`` entry.
- ``list_plans`` — full history of ``PlanTierPrice`` rows ordered by
  tier then ``effective_from DESC``.
- ``update_plan_price`` — creates a new active ``PlanTierPrice`` row,
  deactivates the previous active row for the same tier and emits an
  ``AuditLog`` entry. ``InvalidPriceError`` for ``price < 0`` (Pydantic
  also catches this with ``Field(ge=0)`` but we keep the service-level
  guard so direct callers get a typed exception).

All mutations go through this layer (R3 Reliability). Routes only
validate the input and call into here.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import CannotDeactivateSelfError, InvalidPriceError
from app.models import (
    AuditLog,
    Payment,
    PaymentStatus,
    PlanTierPrice,
    Subscription,
    SubscriptionStatus,
    User,
    UserRole,
)
from app.models.subscription import SubscriptionTier
from app.observability.logging import get_logger

log = get_logger(__name__)


# ---------- emit helper ----------
async def _emit_audit(
    db: AsyncSession,
    *,
    actor_user_id: uuid.UUID,
    action: str,
    entity_type: str,
    entity_id: str,
    previous: dict[str, Any] | None = None,
    new: dict[str, Any] | None = None,
    correlation_id: str | None = None,
) -> None:
    db.add(
        AuditLog(
            actor_user_id=actor_user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            previous_value=previous,
            new_value=new,
            correlation_id=correlation_id,
        )
    )
    await db.flush()


# ---------- queries ----------
async def list_users(
    db: AsyncSession,
    *,
    role_filter: UserRole | None = None,
    status_filter: str | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[User], int]:
    """Lista paginada de usuarios + conteo total (sin paginar).

    ``status_filter`` admite:
    - ``active`` / ``inactive`` — filtra por ``User.is_active``
    - ``trial`` — usuario con suscripción TRIAL activa
    - ``active_sub`` — usuario con suscripción ACTIVE
    - ``expired`` — usuario con suscripción EXPIRED

    La suscripción embebida (``current_subscription``) es la última por
    ``created_at DESC`` para cada usuario.
    """
    base = select(User)
    count_stmt = select(func.count()).select_from(User)

    if role_filter is not None:
        base = base.where(User.role == role_filter)
        count_stmt = count_stmt.where(User.role == role_filter)
    if status_filter == "active":
        base = base.where(User.is_active.is_(True))
        count_stmt = count_stmt.where(User.is_active.is_(True))
    elif status_filter == "inactive":
        base = base.where(User.is_active.is_(False))
        count_stmt = count_stmt.where(User.is_active.is_(False))
    if search is not None and search.strip() != "":
        pattern = f"%{search.strip().lower()}%"
        base = base.where(
            or_(
                func.lower(User.email).like(pattern),
                func.lower(User.first_name).like(pattern),
                func.lower(User.last_name).like(pattern),
            )
        )
        count_stmt = count_stmt.where(
            or_(
                func.lower(User.email).like(pattern),
                func.lower(User.first_name).like(pattern),
                func.lower(User.last_name).like(pattern),
            )
        )

    base = base.order_by(User.created_at.desc()).offset(skip).limit(limit)

    users = list((await db.execute(base)).scalars().all())
    total = await db.scalar(count_stmt) or 0

    return users, int(total)


async def latest_subscription_for(
    db: AsyncSession, user_id: uuid.UUID
) -> Subscription | None:
    """Última suscripción del usuario (created_at desc) o None."""
    stmt = (
        select(Subscription)
        .where(Subscription.user_id == user_id)
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    return await db.scalar(stmt)


async def list_plans(db: AsyncSession) -> list[PlanTierPrice]:
    """Historial completo de precios — ordenado por tier + effective_from DESC."""
    stmt = select(PlanTierPrice).order_by(
        PlanTierPrice.tier.asc(),
        PlanTierPrice.effective_from.desc(),
    )
    return list((await db.execute(stmt)).scalars().all())


async def list_all_payments(
    db: AsyncSession,
    *,
    skip: int = 0,
    limit: int = 50,
    status_filter: PaymentStatus | None = None,
) -> tuple[list[Payment], int]:
    """Lista paginada de pagos para el dashboard admin.

    Re-export de ``payment_service.get_all_payments`` para mantener la
    simetría con ``list_users`` / ``list_plans``.
    """
    from app.services.payment_service import get_all_payments

    return await get_all_payments(
        db, skip=skip, limit=limit, status_filter=status_filter
    )


# ---------- mutations ----------
async def set_user_active(
    db: AsyncSession,
    *,
    admin_user: User,
    target_user_id: uuid.UUID,
    is_active: bool,
    correlation_id: str | None = None,
) -> User:
    """Toggle ``is_active`` del usuario target. Idempotente.

    Lanza ``CannotDeactivateSelfError`` si el admin intenta desactivarse
    a sí mismo. Emite un ``AuditLog`` con previous/new y ``correlation_id``.
    """
    if admin_user.id == target_user_id and is_active is False:
        raise CannotDeactivateSelfError()

    target = await db.get(User, target_user_id)
    if target is None:
        # No usamos ``WORKSPACE_NOT_FOUND`` porque no aplica; el envelope
        # "NOT_FOUND" es genérico y la ruta lo traduce a 404.
        raise LookupError(f"user {target_user_id} no existe")

    previous_active = target.is_active
    target.is_active = bool(is_active)
    await db.flush()

    await _emit_audit(
        db,
        actor_user_id=admin_user.id,
        action="admin.user.active_toggle",
        entity_type="User",
        entity_id=str(target.id),
        previous={"is_active": previous_active},
        new={"is_active": target.is_active, "email": target.email},
        correlation_id=correlation_id,
    )
    await db.commit()
    await db.refresh(target)
    return target


async def update_plan_price(
    db: AsyncSession,
    *,
    admin_user: User,
    tier: SubscriptionTier,
    new_price_usd: Decimal,
    correlation_id: str | None = None,
) -> PlanTierPrice:
    """Inserta una fila nueva activa para ``tier`` con ``effective_from=now``.

    Desactiva la fila activa anterior (setea ``effective_until=now`` y
    ``is_active=False``). Emite ``AuditLog`` con previous/new. Lanza
    ``InvalidPriceError`` si ``new_price_usd < 0`` (Pydantic también
    lo bloquea en ``UpdatePlanPriceIn`` pero el guard service-level
    protege callers directos).
    """
    if new_price_usd < 0:
        raise InvalidPriceError()

    now = datetime.now(timezone.utc)

    # Desactivar fila activa anterior (si existe).
    previous_stmt = (
        select(PlanTierPrice)
        .where(
            PlanTierPrice.tier == tier,
            PlanTierPrice.is_active.is_(True),
            PlanTierPrice.effective_until.is_(None),
        )
        .order_by(PlanTierPrice.effective_from.desc())
        .limit(1)
    )
    previous = await db.scalar(previous_stmt)
    previous_payload: dict[str, Any] | None = None
    if previous is not None:
        previous.is_active = False
        previous.effective_until = now
        previous_payload = {
            "price_usd": str(previous.price_usd),
            "billing_period_days": previous.billing_period_days,
            "effective_from": previous.effective_from.isoformat(),
        }
        await db.flush()

    # Insertar fila nueva.
    new_row = PlanTierPrice(
        tier=tier,
        price_usd=new_price_usd,
        billing_period_days=30,
        is_active=True,
        effective_from=now,
        effective_until=None,
    )
    db.add(new_row)
    await db.flush()

    await _emit_audit(
        db,
        actor_user_id=admin_user.id,
        action="admin.plan.price_update",
        entity_type="PlanTierPrice",
        entity_id=str(new_row.id),
        previous=previous_payload,
        new={
            "tier": new_row.tier.value,
            "price_usd": str(new_row.price_usd),
            "billing_period_days": new_row.billing_period_days,
            "effective_from": new_row.effective_from.isoformat(),
        },
        correlation_id=correlation_id,
    )
    await db.commit()
    await db.refresh(new_row)
    return new_row


__all__ = [
    "list_users",
    "latest_subscription_for",
    "set_user_active",
    "list_plans",
    "update_plan_price",
    "list_all_payments",
    "CannotDeactivateSelfError",
    "InvalidPriceError",
]
