"""create plan_tier_prices table

Revision ID: 0004_create_plan_tier_prices
Revises: 0003_create_subscriptions
Create Date: 2026-08-31 22:40:00

p0b.1a: tabla ``plan_tier_prices`` para historial de precios por tier.
Cada fila representa el precio vigente durante ``[effective_from,
effective_until)`` — el activo es el que tiene ``is_active=True`` y
``effective_until IS NULL``.

Reutiliza el enum ``subscription_tier`` creado en 0003 (``create_type=False``).
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004_create_plan_tier_prices"
down_revision: Union[str, None] = "0003_create_subscriptions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "plan_tier_prices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tier",
            postgresql.ENUM(
                "STARTER", "PLUS", "ELITE",
                name="subscription_tier",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("price_usd", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "billing_period_days",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("30"),
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column(
            "effective_from",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "effective_until",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint(
            "tier", "effective_from", name="uq_plan_tier_prices_tier_effective_from"
        ),
    )

    op.create_index(
        "ix_plan_tier_prices_tier_active",
        "plan_tier_prices",
        ["tier", "is_active"],
    )
    op.create_index(
        "ix_plan_tier_prices_deleted_at",
        "plan_tier_prices",
        ["deleted_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_plan_tier_prices_deleted_at", table_name="plan_tier_prices"
    )
    op.drop_index(
        "ix_plan_tier_prices_tier_active", table_name="plan_tier_prices"
    )
    op.drop_table("plan_tier_prices")
