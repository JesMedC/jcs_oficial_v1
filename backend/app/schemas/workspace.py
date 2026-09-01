"""Workspace schemas."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models import WorkspaceMemberRole, WorkspacePlanTier


class WorkspaceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    plan_tier: WorkspacePlanTier
    role_in_workspace: WorkspaceMemberRole
    created_at: datetime