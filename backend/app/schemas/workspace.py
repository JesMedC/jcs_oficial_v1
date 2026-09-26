"""Workspace schemas."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models import WorkspaceMemberRole, WorkspacePlanTier


class WorkspaceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    plan_tier: WorkspacePlanTier
    role_in_workspace: WorkspaceMemberRole
    created_at: datetime
    # REQ-DSC-007: frontend surfaces this in the Disciplina tab. NULL
    # means "use the plan ceiling".
    session_ops_cap: int | None = None
    daily_loss_pct: Decimal | None = None
    weekly_loss_pct: Decimal | None = None
    monthly_loss_pct: Decimal | None = None


class WorkspaceDisciplineOut(BaseModel):
    """PATCH /workspaces/{id}/discipline response (REQ-DSC-004)."""

    model_config = ConfigDict(from_attributes=True)

    workspace_id: uuid.UUID
    plan_tier: WorkspacePlanTier
    session_ops_cap: int | None
    daily_loss_pct: Decimal | None = None
    weekly_loss_pct: Decimal | None = None
    monthly_loss_pct: Decimal | None = None
    # The ceiling that ``plan_ceiling_for(plan_tier)`` resolves to —
    # the frontend uses it as the ``max`` for the input.
    ceiling: int


class WorkspaceDisciplinePatchIn(BaseModel):
    """Body for PATCH /workspaces/{id}/discipline.

    ``session_ops_cap`` is optional: ``None`` resets to the plan-tier
    ceiling (REQ-DSC-003). Any non-None value MUST satisfy
    ``1 <= value <= plan_ceiling_for(workspace.plan_tier)`` — the
    endpoint enforces that server-side.
    """

    model_config = ConfigDict(extra="forbid")

    session_ops_cap: int | None = None
    daily_loss_pct: Decimal | None = Field(
        default=None, ge=Decimal("0"), le=Decimal("100"), max_digits=6, decimal_places=2
    )
    weekly_loss_pct: Decimal | None = Field(
        default=None, ge=Decimal("0"), le=Decimal("100"), max_digits=6, decimal_places=2
    )
    monthly_loss_pct: Decimal | None = Field(
        default=None, ge=Decimal("0"), le=Decimal("100"), max_digits=6, decimal_places=2
    )
