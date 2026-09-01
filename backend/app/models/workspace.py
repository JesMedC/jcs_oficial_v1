"""Workspace model + ``WorkspacePlanTier`` enum (NONE | STARTER | PRO | ELITE)."""
from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.workspace_member import WorkspaceMember


class WorkspacePlanTier(str, enum.Enum):
    NONE = "NONE"
    STARTER = "STARTER"
    PRO = "PRO"
    ELITE = "ELITE"


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

    members: Mapped[list["WorkspaceMember"]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Workspace id={self.id} name={self.name!r} tier={self.plan_tier}>"