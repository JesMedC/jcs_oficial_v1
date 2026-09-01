"""``GET /api/v1/auth/me`` — usuario actual + workspaces + suscripción."""
from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.auth import AuthMeOut
from app.schemas.subscription import SubscriptionOut
from app.schemas.workspace import WorkspaceOut
from app.services.subscription_service import get_user_active_subscription
from app.services.user_service import get_user_workspaces

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=AuthMeOut)
async def me(user: CurrentUser, db: DbSession) -> AuthMeOut:
    workspaces = await get_user_workspaces(db, user.id)
    workspace_outs = [
        WorkspaceOut(
            id=ws.id,
            name=ws.name,
            plan_tier=ws.plan_tier,
            role_in_workspace=role,
            created_at=ws.created_at,
        )
        for ws, role in workspaces
    ]

    sub = await get_user_active_subscription(db, user.id)
    sub_out: SubscriptionOut | None = None
    if sub is not None:
        sub_out = SubscriptionOut.model_validate(sub)

    return AuthMeOut(
        user_id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        role=user.role,
        workspaces=workspace_outs,
        current_subscription=sub_out,
    )
