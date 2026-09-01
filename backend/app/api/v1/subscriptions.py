"""Subscriptions endpoints — GET /me, POST /upgrade, POST /cancel.

Todas las mutaciones pasan por ``subscription_service`` (R3).
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request

from app.api.deps import CurrentUser, DbSession
from app.models.subscription import SubscriptionTier
from app.schemas.subscription import (
    CancelOut,
    SubscriptionOut,
    UpgradeIn,
    UpgradeOut,
)
from app.services.subscription_service import (
    SubscriptionError,
    cancel_subscription,
    get_user_active_subscription,
    upgrade_subscription,
)
from app.services.user_service import get_user_workspaces

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


def _correlation_id(request: Request) -> str | None:
    return getattr(request.state, "correlation_id", None)


def _raise_sub_error(exc: SubscriptionError) -> None:
    raise HTTPException(
        status_code=exc.status,
        detail={
            "code": exc.code,
            "message": exc.message,
            "correlation_id": "0" * 36,
        },
    )


@router.get("/me", response_model=SubscriptionOut)
async def get_my_subscription(
    user: CurrentUser, db: DbSession
) -> SubscriptionOut:
    """Devuelve la subscripción activa del usuario o 404 si no tiene."""
    sub = await get_user_active_subscription(db, user.id)
    if sub is None:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "SUBSCRIPTION_NOT_FOUND",
                "message": "No tienes suscripcion activa",
                "correlation_id": "0" * 36,
            },
        )
    return SubscriptionOut.model_validate(sub)


@router.post("/upgrade", response_model=UpgradeOut)
async def upgrade(
    payload: UpgradeIn,
    user: CurrentUser,
    db: DbSession,
    request: Request,
) -> UpgradeOut:
    """Stub: devuelve ``{checkout_url, mp_preference_id}``.

    La integración real con MercadoPago se cablea en p0c.
    """
    # El usuario debe tener al menos un workspace para la subs.
    workspaces = await get_user_workspaces(db, user.id)
    if not workspaces:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "WORKSPACE_NOT_FOUND",
                "message": "No tienes workspace para suscribirte",
                "correlation_id": "0" * 36,
            },
        )
    workspace, _role = workspaces[0]

    try:
        result = await upgrade_subscription(
            db,
            user=user,
            workspace=workspace,
            target_tier=SubscriptionTier(payload.tier),
            correlation_id=_correlation_id(request),
        )
    except SubscriptionError as exc:
        _raise_sub_error(exc)
    return UpgradeOut(**result)


@router.post("/cancel", response_model=CancelOut)
async def cancel(
    user: CurrentUser,
    db: DbSession,
    request: Request,
) -> CancelOut:
    """Cancela la suscripción actual. Idempotencia por la query de status."""
    try:
        sub = await cancel_subscription(
            db,
            user=user,
            correlation_id=_correlation_id(request),
        )
    except SubscriptionError as exc:
        _raise_sub_error(exc)
    return CancelOut(
        subscription_id=sub.id,
        tier=sub.tier,
        status=sub.status,
        canceled_at=datetime.now(timezone.utc),
    )
