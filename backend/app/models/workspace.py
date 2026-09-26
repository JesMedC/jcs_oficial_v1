"""Workspace model + ``WorkspacePlanTier`` enum (NONE | STARTER | PRO | ELITE).

REQ-DSC-001: ``Workspace.session_ops_cap`` is a nullable SMALLINT that
overrides the plan-tier session ops ceiling when set. NULL means "use
the ceiling". The single source of truth for the ceiling lives in
``app.services.discipline_engine._PLAN_CEILING_BY_TIER``.
"""
from __future__ import annotations

import enum
import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, Numeric, SmallInteger, String
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
    # REQ-DSC-001: nullable SMALLINT. NULL = use the plan-tier ceiling
    # (``plan_ceiling_for(workspace.plan_tier)``). App-side validation
    # in the PATCH endpoint enforces ``1 <= value <= ceiling`` — no DB
    # CHECK constraint because the ceiling is plan-tier-aware.
    session_ops_cap: Mapped[int | None] = mapped_column(
        SmallInteger, nullable=True
    )
    # Mutually exclusive risk-control mode. Existing workspaces default
    # to operations mode so legacy session-cap behaviour is preserved.
    risk_control_mode: Mapped[str] = mapped_column(
        String(32),
        default=WorkspaceRiskControlMode.OPERATIONS.value,
        server_default=WorkspaceRiskControlMode.OPERATIONS.value,
        nullable=False,
    )
    # Nullable Decimal percentages. NULL means the corresponding
    # realized-loss guard is disabled; this preserves today's safe
    # default until the workspace explicitly opts into a stop-loss.
    daily_loss_pct: Mapped[Decimal | None] = mapped_column(
        Numeric(6, 2), nullable=True
    )
    weekly_loss_pct: Mapped[Decimal | None] = mapped_column(
        Numeric(6, 2), nullable=True
    )
    monthly_loss_pct: Mapped[Decimal | None] = mapped_column(
        Numeric(6, 2), nullable=True
    )

    members: Mapped[list[WorkspaceMember]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"<Workspace id={self.id} name={self.name!r} "
            f"tier={self.plan_tier} cap={self.session_ops_cap}>"
        )
