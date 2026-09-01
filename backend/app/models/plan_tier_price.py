"""PlanTierPrice — historial de precios por tier.

Una fila por (tier, ``effective_from``) que marca el precio vigente durante
el periodo ``[effective_from, effective_until)``. La fila "actual" es la
que tiene ``is_active=True`` y ``effective_until IS NULL``.

Inicialmente seedeada con los tres tiers (Starter $0 / Plus $9.99 /
Elite $29.99, todos al 30 días). Cambios de precio futuros se insertan
como filas nuevas con ``is_active=False`` en la anterior.
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin
from app.models.subscription import SubscriptionTier


class PlanTierPrice(Base, TimestampMixin):
    __tablename__ = "plan_tier_prices"

    tier: Mapped[SubscriptionTier] = mapped_column(
        Enum(
            SubscriptionTier,
            name="subscription_tier",
            values_callable=lambda enum: [m.value for m in enum],
            create_type=False,
        ),
        nullable=False,
    )
    price_usd: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    billing_period_days: Mapped[int] = mapped_column(default=30, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    effective_from: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    effective_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )

    __table_args__ = (
        UniqueConstraint(
            "tier", "effective_from", name="uq_plan_tier_prices_tier_effective_from"
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<PlanTierPrice tier={self.tier} price={self.price_usd} "
            f"active={self.is_active}>"
        )
