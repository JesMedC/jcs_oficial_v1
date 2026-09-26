"""Workspace model + ``WorkspacePlanTier`` enum (NONE | STARTER | PRO | ELITE).

REQ-DSC-001: ``Workspace.session_ops_cap`` is a nullable SMALLINT that
overrides the plan-tier session ops ceiling when set. NULL means "use
the ceiling". The single source of truth for the ceiling lives in
``app.services.discipline_engine._PLAN_CEILING_BY_TIER``.
"""
from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.workspace_member import WorkspaceMember


class WorkspacePlanTier(str, enum.Enum):
    NONE = "NONE"
    STARTER = "STARTER"
    PRO = "PRO"
    ELITE = "ELITE"


class WorkspaceRiskControlMode(str, enum.Enum):
    OPERATIONS = "operations"
    PERCENTAGE_LOSS = "percentage_loss"


class Workspace(Base, TimestampMixin):
    __tablename__ = "workspaces"

    name: Mapped[str] = mapped_column(String(80), nullable=False)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    plan_tier: Mapped[WorkspacePlanTier] = mapped_column(
        Enum(
            WorkspacePlanTier,
            name="workspace_plan_tier",
            values_callable=lambda enum: [m.value for m in enum],
        ),
        default=WorkspacePlanTier.NONE,
        server_default=WorkspacePlanTier.NONE.value,
        nullable=False,
    )
    # Note: per-account risk-control settings (risk_control_mode,
    # session_ops_cap override, daily/weekly/monthly loss percentages)
    # now live on ``TradingAccount`` (see migration 0022). The
    # workspace only carries the plan-tier ceiling as a fallback for
    # accounts that haven't configured their own override.

    members: Mapped[list[WorkspaceMember]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"<Workspace id={self.id} name={self.name!r} "
            f"tier={self.plan_tier}>"
        )
