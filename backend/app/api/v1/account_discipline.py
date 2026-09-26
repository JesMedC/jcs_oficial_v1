"""Accounts API — per-account discipline/risk-control settings.

Slice A of ``sessions-configurable-cap`` originally exposed
``PATCH /workspaces/{workspace_id}/discipline``. After the per-account
move (migration 0022) the endpoint now lives under ``/accounts`` so
each account owns its own session_ops_cap, daily_loss_pct,
weekly_loss_pct, monthly_loss_pct, and the mutually-exclusive
``risk_control_mode`` (operations vs percentage_loss).

The discipline engine still buckets trades per account (already did
before this move); the workspace columns are gone, so two accounts
in the same workspace can now run different caps without leaking
through one shared setting.

Errors:
- 422 ``DISCIPLINE_CAP_OUT_OF_RANGE`` when ``session_ops_cap`` is
  outside ``[1, plan_ceiling]``; the message includes the ceiling
  so the client can render a localized "tope N" pill.
- 403 ``WORKSPACE_ACCESS_DENIED`` when the caller is not a member.
- 404 ``NOT_FOUND`` when the account does not exist.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.models import TradingAccount, Workspace
from app.models.workspace import WorkspaceRiskControlMode
from app.schemas.envelope import ErrorCode
from app.schemas.workspace import (
    WorkspaceDisciplineOut,
    WorkspaceDisciplinePatchIn,
)
from app.services.discipline_engine import plan_ceiling_for
from app.services.workspace_service import get_user_workspace_role

router = APIRouter(prefix="/accounts", tags=["accounts"])


def _account_discipline_out(
    account: TradingAccount, *, workspace: Workspace, ceiling: int
) -> WorkspaceDisciplineOut:
    return WorkspaceDisciplineOut(
        workspace_id=account.workspace_id,
        plan_tier=workspace.plan_tier,
        risk_control_mode=account.risk_control_mode,
        session_ops_cap=account.session_ops_cap,
        daily_loss_pct=account.daily_loss_pct,
        weekly_loss_pct=account.weekly_loss_pct,
        monthly_loss_pct=account.monthly_loss_pct,
        ceiling=ceiling,
    )


async def _get_member_account(
    db: DbSession,
    *,
    user_id: uuid.UUID,
    account_id: uuid.UUID,
) -> TradingAccount:
    account = await db.scalar(
        select(TradingAccount).where(TradingAccount.id == account_id)
    )
    if account is None:
        raise HTTPException(
            status_code=404,
            detail={
                "code": ErrorCode.NOT_FOUND.value,
                "message": "cuenta no encontrada",
                "correlation_id": "0" * 36,
            },
        )
    role = await get_user_workspace_role(
        db, user_id, account.workspace_id
    )
    if role is None:
        raise HTTPException(
            status_code=403,
            detail={
                "code": ErrorCode.WORKSPACE_ACCESS_DENIED.value,
                "message": "No tienes acceso a esta cuenta",
                "correlation_id": "0" * 36,
            },
        )
    return account


@router.get(
    "/{account_id}/discipline",
    response_model=WorkspaceDisciplineOut,
)
async def get_account_discipline(
    account_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
) -> WorkspaceDisciplineOut:
    """Read per-account discipline/risk-control settings."""
    account = await _get_member_account(
        db, user_id=user.id, account_id=account_id
    )
    workspace = await db.scalar(
        select(Workspace).where(Workspace.id == account.workspace_id)
    )
    ceiling = plan_ceiling_for(workspace.plan_tier) if workspace else 4
    return _account_discipline_out(account, workspace=workspace, ceiling=ceiling)


@router.patch(
    "/{account_id}/discipline",
    response_model=WorkspaceDisciplineOut,
)
async def patch_account_discipline(
    account_id: uuid.UUID,
    payload: WorkspaceDisciplinePatchIn,
    user: CurrentUser,
    db: DbSession,
) -> WorkspaceDisciplineOut:
    """Update per-account discipline settings (REQ-DSC-004 + REQ-DSC-005).

    Rules:
    - Caller MUST be a workspace member of the account (403 otherwise).
    - ``session_ops_cap=None`` resets to the plan-tier ceiling
      (REQ-DSC-003).
    - Otherwise ``1 <= value <= plan_ceiling_for(workspace.plan_tier)``
      is enforced. Out-of-range returns 422 with code
      ``DISCIPLINE_CAP_OUT_OF_RANGE`` and a message that includes
      the ceiling so the frontend can show a localized "tope N"
      pill without a follow-up query.
    """
    account = await _get_member_account(
        db, user_id=user.id, account_id=account_id
    )
    workspace = await db.scalar(
        select(Workspace).where(Workspace.id == account.workspace_id)
    )
    ceiling = plan_ceiling_for(workspace.plan_tier) if workspace else 4

    fields = payload.model_fields_set
    loss_fields = {"daily_loss_pct", "weekly_loss_pct", "monthly_loss_pct"}
    has_loss_payload = bool(fields & loss_fields)
    has_cap_payload = "session_ops_cap" in fields

    requested_mode = payload.risk_control_mode
    if requested_mode is None:
        if has_cap_payload:
            requested_mode = WorkspaceRiskControlMode.OPERATIONS
        elif has_loss_payload:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "DISCIPLINE_MODE_REQUIRED",
                    "message": (
                        "risk_control_mode=percentage_loss is required "
                        "when updating loss percentage limits"
                    ),
                    "correlation_id": "0" * 36,
                    "details": {"field": "risk_control_mode"},
                },
            )
        else:
            requested_mode = WorkspaceRiskControlMode(account.risk_control_mode)

    if requested_mode == WorkspaceRiskControlMode.OPERATIONS:
        if payload.session_ops_cap is not None and not (
            1 <= payload.session_ops_cap <= ceiling
        ):
            raise HTTPException(
                status_code=422,
                detail={
                    "code": ErrorCode.DISCIPLINE_CAP_OUT_OF_RANGE.value,
                    "message": (
                        f"session_ops_cap {payload.session_ops_cap} fuera de "
                        f"rango; techo {ceiling}"
                    ),
                    "correlation_id": "0" * 36,
                    "details": {
                        "field": "session_ops_cap",
                        "min": 1,
                        "max": ceiling,
                        "submitted": payload.session_ops_cap,
                    },
                },
            )
        account.risk_control_mode = WorkspaceRiskControlMode.OPERATIONS.value
        if has_cap_payload:
            account.session_ops_cap = payload.session_ops_cap
        account.daily_loss_pct = None
        account.weekly_loss_pct = None
        account.monthly_loss_pct = None
    else:
        if has_cap_payload and payload.session_ops_cap is not None:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "DISCIPLINE_MODE_CONFLICT",
                    "message": (
                        "session_ops_cap cannot be set when "
                        "risk_control_mode=percentage_loss"
                    ),
                    "correlation_id": "0" * 36,
                    "details": {"field": "session_ops_cap"},
                },
            )
        account.risk_control_mode = WorkspaceRiskControlMode.PERCENTAGE_LOSS.value
        account.session_ops_cap = None
        if "daily_loss_pct" in fields:
            account.daily_loss_pct = payload.daily_loss_pct
        if "weekly_loss_pct" in fields:
            account.weekly_loss_pct = payload.weekly_loss_pct
        if "monthly_loss_pct" in fields:
            account.monthly_loss_pct = payload.monthly_loss_pct
    db.add(account)
    await db.commit()
    await db.refresh(account)

    return _account_discipline_out(account, workspace=workspace, ceiling=ceiling)


__all__ = ["router"]
