"""Admin API router — p0b.2 + p0c.

Endpoints bajo ``/api/v1/admin``:

- ``GET  /users`` — lista paginada de usuarios + última suscripción
- ``PATCH /users/{user_id}`` — toggle ``is_active``
- ``GET  /plans`` — historial completo de precios
- ``PATCH /plans/{tier}`` — crea un precio nuevo, desactiva el anterior
- ``GET  /payments`` — lista paginada de pagos (p0c)
- ``GET  /analytics/top-pages`` — top páginas (p0c)
- ``GET  /analytics/summary`` — KPIs agregados (p0c)

Todas las rutas usan ``require_admin`` (``AdminUser`` dependency). Las
mutaciones pasan por ``app.services.admin_service`` (R3). Los errores
de servicio se traducen a ``ErrorEnvelope`` vía ``_raise_admin_error``.
"""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request, status

from app.api.deps import AdminUser, DbSession
from app.core.errors import CannotDeactivateSelfError, InvalidPriceError
from app.models import PaymentStatus, UserRole
from app.models.subscription import SubscriptionTier
from app.schemas.admin import (
    AdminUserListOut,
    PlanTierPriceOut,
    SetUserActiveIn,
    UpdatePlanPriceIn,
    UserWithSubscriptionOut,
)
from app.schemas.envelope import ErrorCode
from app.schemas.page_view import AnalyticsSummaryOut, TopPageOut
from app.schemas.payment import PaymentListOut, PaymentOut
from app.schemas.user import UserOut
from app.services.admin_service import (
    latest_subscription_for,
    list_all_payments,
    list_plans,
    list_users,
    set_user_active,
    update_plan_price,
)
from app.services.analytics_service import (
    get_analytics_summary,
    get_top_pages,
)

router = APIRouter(prefix="/admin", tags=["admin"])


def _correlation_id(request: Request) -> str | None:
    return getattr(request.state, "correlation_id", None)


def _raise_admin_error(exc: Exception) -> None:
    """Traduce errores de admin_service a ErrorEnvelope."""
    if isinstance(exc, CannotDeactivateSelfError):
        raise HTTPException(
            status_code=403,
            detail={
                "code": ErrorCode.ADMINAC_CANNOT_DEACTIVATE_SELF.value,
                "message": exc.message,
                "correlation_id": "0" * 36,
            },
        )
    if isinstance(exc, InvalidPriceError):
        raise HTTPException(
            status_code=422,
            detail={
                "code": ErrorCode.ADMINAC_INVALID_PRICE.value,
                "message": exc.message,
                "correlation_id": "0" * 36,
            },
        )
    if isinstance(exc, LookupError):
        raise HTTPException(
            status_code=404,
            detail={
                "code": ErrorCode.NOT_FOUND.value,
                "message": str(exc),
                "correlation_id": "0" * 36,
            },
        )
    raise exc


@router.get("/users", response_model=AdminUserListOut)
async def list_users_route(
    _admin: AdminUser,
    db: DbSession,
    role: Annotated[UserRole | None, Query()] = None,
    status_filter: Annotated[
        str | None,
        Query(alias="status", description="active|inactive|trial|active_sub|expired"),
    ] = None,
    search: Annotated[str | None, Query(max_length=120)] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> AdminUserListOut:
    """Lista paginada de usuarios con su última suscripción embebida."""
    users, total = await list_users(
        db,
        role_filter=role,
        status_filter=status_filter,
        search=search,
        skip=skip,
        limit=limit,
    )
    items: list[UserWithSubscriptionOut] = []
    for user in users:
        sub = await latest_subscription_for(db, user.id)
        items.append(
            UserWithSubscriptionOut(
                id=user.id,
                email=user.email,
                first_name=user.first_name,
                last_name=user.last_name,
                phone=user.phone,
                role=user.role,
                is_active=user.is_active,
                email_verified_at=user.email_verified_at,
                created_at=user.created_at,
                current_subscription=sub,
            )
        )
    return AdminUserListOut(items=items, total=total, skip=skip, limit=limit)


@router.patch("/users/{user_id}", response_model=UserOut)
async def set_user_active_route(
    user_id: uuid.UUID,
    payload: SetUserActiveIn,
    admin: AdminUser,
    db: DbSession,
    request: Request,
) -> UserOut:
    """Toggle ``is_active`` del usuario target. Bloquea self-deactivation."""
    try:
        target = await set_user_active(
            db,
            admin_user=admin,
            target_user_id=user_id,
            is_active=payload.is_active,
            correlation_id=_correlation_id(request),
        )
    except (CannotDeactivateSelfError, InvalidPriceError, LookupError) as exc:
        _raise_admin_error(exc)
    return UserOut.model_validate(target)


@router.get("/plans", response_model=list[PlanTierPriceOut])
async def list_plans_route(
    _admin: AdminUser,
    db: DbSession,
) -> list[PlanTierPriceOut]:
    """Historial completo de precios de plan (todos los tiers)."""
    rows = await list_plans(db)
    return [PlanTierPriceOut.model_validate(r) for r in rows]


@router.patch("/plans/{tier}", response_model=PlanTierPriceOut)
async def update_plan_price_route(
    tier: SubscriptionTier,
    payload: UpdatePlanPriceIn,
    admin: AdminUser,
    db: DbSession,
    request: Request,
) -> PlanTierPriceOut:
    """Inserta precio nuevo para ``tier`` y desactiva el anterior."""
    try:
        new_row = await update_plan_price(
            db,
            admin_user=admin,
            tier=tier,
            new_price_usd=payload.price_usd,
            correlation_id=_correlation_id(request),
        )
    except (CannotDeactivateSelfError, InvalidPriceError, LookupError) as exc:
        _raise_admin_error(exc)
    return PlanTierPriceOut.model_validate(new_row)


@router.get("/payments", response_model=PaymentListOut)
async def admin_list_payments_route(
    _admin: AdminUser,
    db: DbSession,
    status_filter: Annotated[
        PaymentStatus | None,
        Query(alias="status", description="PENDING|APPROVED|REJECTED|CANCELLED|REFUNDED"),
    ] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> PaymentListOut:
    """Lista paginada de pagos (todos los usuarios) con filtro por status."""
    items, total = await list_all_payments(
        db, skip=skip, limit=limit, status_filter=status_filter
    )
    return PaymentListOut(
        items=[PaymentOut.model_validate(p) for p in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/analytics/top-pages", response_model=list[TopPageOut])
async def admin_top_pages_route(
    _admin: AdminUser,
    db: DbSession,
    days: Annotated[int, Query(ge=1, le=365)] = 30,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> list[TopPageOut]:
    """Páginas más visitadas del periodo."""
    return await get_top_pages(db, days=days, limit=limit)


@router.get("/analytics/summary", response_model=AnalyticsSummaryOut)
async def admin_analytics_summary_route(
    _admin: AdminUser,
    db: DbSession,
    days: Annotated[int, Query(ge=1, le=365)] = 30,
) -> AnalyticsSummaryOut:
    """KPIs agregados del periodo."""
    return await get_analytics_summary(db, days=days)
