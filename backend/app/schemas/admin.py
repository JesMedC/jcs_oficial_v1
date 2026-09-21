"""Admin schemas — p0b.2.

Request/response contracts for the admin module:

- ``UserWithSubscriptionOut`` — user payload with the latest
  subscription embedded so the admin table can render "tier + status"
  inline.
- ``AdminUserListOut`` — paginated envelope around ``UserWithSubscriptionOut``.
- ``SetUserActiveIn`` — body for PATCH /admin/users/{id}.
- ``PlanTierPriceOut`` — price row including effective_until so the
  history table can list deactivated rows.
- ``UpdatePlanPriceIn`` — body for PATCH /admin/plans/{tier}.

Keep the field names in sync with ``app.models.user.User``,
``app.models.subscription.Subscription`` and
``app.models.plan_tier_price.PlanTierPrice``.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models import UserRole
from app.models.subscription import SubscriptionStatus, SubscriptionTier
from app.schemas.subscription import SubscriptionOut


class UserWithSubscriptionOut(BaseModel):
    """User row + latest subscription (for the admin users table)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    phone: str
    role: UserRole
    is_active: bool
    email_verified_at: datetime | None
    created_at: datetime
    current_subscription: SubscriptionOut | None = None


class AdminUserListOut(BaseModel):
    """Paginated envelope for ``GET /api/v1/admin/users``."""

    items: list[UserWithSubscriptionOut]
    total: int
    skip: int
    limit: int


class SetUserActiveIn(BaseModel):
    """Body for ``PATCH /api/v1/admin/users/{user_id}``."""

    model_config = ConfigDict(extra="forbid")

    is_active: bool


class PlanTierPriceOut(BaseModel):
    """One row of the plan price history."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tier: SubscriptionTier
    price_usd: Decimal
    billing_period_days: int
    is_active: bool
    effective_from: datetime
    effective_until: datetime | None
    created_at: datetime


class UpdatePlanPriceIn(BaseModel):
    """Body for ``PATCH /api/v1/admin/plans/{tier}``.

    Backend stores ``Numeric(10, 2)`` for ``price_usd`` so we cap at
    ``Decimal("99999999.99")`` and floor at 0 — the service raises
    ``InvalidPriceError`` for negatives and Pydantic raises 422 for
    anything else.
    """

    model_config = ConfigDict(extra="forbid")

    price_usd: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
