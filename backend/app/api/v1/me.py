"""``GET /api/v1/auth/me`` + ``PATCH /api/v1/auth/me`` — current user.

GET returns the authenticated user, workspaces, and active
subscription. PATCH (added in PR-1 of ``one-by-one-thousand-discipline``)
accepts a single optional ``timezone`` field (IANA name) — drives the
4-band session resolver (``session_service``) and the day/session
math in the discipline engine.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app.api.deps import CurrentUser, DbSession
from app.schemas.auth import AuthMeOut
from app.schemas.envelope import ErrorCode
from app.schemas.subscription import SubscriptionOut
from app.schemas.workspace import WorkspaceOut
from app.services.subscription_service import get_user_active_subscription
from app.services.user_service import get_user_workspaces

router = APIRouter(prefix="/auth", tags=["auth"])


class MePatchIn(BaseModel):
    """Body for ``PATCH /api/v1/auth/me``.

    Only ``timezone`` is wired today; future fields (display name,
    avatar) plug in here without breaking the contract.
    """

    model_config = ConfigDict(extra="forbid")

    timezone: str | None = Field(default=None, max_length=64)


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


@router.patch("/me", response_model=AuthMeOut)
async def patch_me(
    user: CurrentUser, db: DbSession, payload: MePatchIn
) -> AuthMeOut:
    """Update mutable profile fields (REQ-DISC-002).

    Accepts an IANA ``timezone`` (validated via ``zoneinfo``). Bad
    TZ names translate to 422 ``INVALID_TIMEZONE`` so the frontend
    can map the error to a localized message.
    """
    from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

    if payload.timezone is not None:
        try:
            ZoneInfo(payload.timezone)
        except ZoneInfoNotFoundError as exc:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": ErrorCode.INVALID_TIMEZONE.value,
                    "message": (
                        f"timezone invalido: {payload.timezone!r}"
                    ),
                    "correlation_id": "0" * 36,
                },
            ) from exc
        user.timezone = payload.timezone
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return await me(user=user, db=db)
