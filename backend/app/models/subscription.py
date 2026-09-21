"""Subscription model + ``SubscriptionTier`` + ``SubscriptionStatus`` enums.

Una ``Subscription`` pertenece a (user, workspace) y representa el plan activo.
Tres tiers (STARTER | PLUS | ELITE) y cuatro estados (TRIAL | ACTIVE |
CANCELED | EXPIRED).

``mp_subscription_id`` / ``mp_preapproval_id`` son los placeholders para
el campo `id` que devuelve MercadoPago cuando el webhook confirma el pago.
Mientras la integración real no esté conectada (p0c), se admiten nulos.
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.workspace import Workspace


class SubscriptionTier(str, enum.Enum):
    STARTER = "STARTER"
    PLUS = "PLUS"
    ELITE = "ELITE"


class SubscriptionStatus(str, enum.Enum):
    TRIAL = "TRIAL"
    ACTIVE = "ACTIVE"
    CANCELED = "CANCELED"
    EXPIRED = "EXPIRED"


class Subscription(Base, TimestampMixin):
    __tablename__ = "subscriptions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    tier: Mapped[SubscriptionTier] = mapped_column(
        Enum(
            SubscriptionTier,
            name="subscription_tier",
            values_callable=lambda enum: [m.value for m in enum],
        ),
        nullable=False,
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(
            SubscriptionStatus,
            name="subscription_status",
            values_callable=lambda enum: [m.value for m in enum],
        ),
        nullable=False,
    )
    current_period_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    current_period_end: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    # MercadoPago — se rellena cuando el webhook confirma el pago (p0c).
    # Mientras tanto, ambas columnas son NULL.
    mp_subscription_id: Mapped[str | None] = mapped_column(
        String(80), nullable=True, default=None
    )
    mp_preapproval_id: Mapped[str | None] = mapped_column(
        String(80), nullable=True, default=None
    )

    user: Mapped["User"] = relationship(back_populates="subscriptions")
    workspace: Mapped["Workspace"] = relationship()

    __table_args__ = (
        Index("ix_subscriptions_user_status", "user_id", "status"),
        Index("ix_subscriptions_workspace_tier", "workspace_id", "tier"),
    )

    def __repr__(self) -> str:
        return (
            f"<Subscription id={self.id} tier={self.tier} "
            f"status={self.status} user={self.user_id}>"
        )
