"""create subscriptions table

Revision ID: 0003_create_subscriptions
Revises: 0002_split_user_name
Create Date: 2026-08-31 22:35:00

p0b.1a: tabla ``subscriptions`` con FKs a ``users`` y ``workspaces``,
dos enums ``subscription_tier`` (STARTER | PLUS | ELITE) y
``subscription_status`` (TRIAL | ACTIVE | CANCELED | EXPIRED), periodos
de inicio/fin, placeholders para ``mp_subscription_id`` y
``mp_preapproval_id``, e índices sobre (user_id, status) y
(workspace_id, tier).

Las FKs son ``ON DELETE CASCADE`` para que al borrar un user / workspace
se elimine también la sub (coherente con ``workspace_members``).
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_create_subscriptions"
down_revision: Union[str, None] = "0002_split_user_name"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- enums ---
    subscription_tier = postgresql.ENUM(
        "STARTER", "PLUS", "ELITE", name="subscription_tier"
    )
    subscription_status = postgresql.ENUM(
        "TRIAL", "ACTIVE", "CANCELED", "EXPIRED", name="subscription_status"
    )
    bind = op.get_bind()
    subscription_tier.create(bind, checkfirst=True)
    subscription_status.create(bind, checkfirst=True)

    # --- table ---
    op.create_table(
        "subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "workspace_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "tier",
            postgresql.ENUM(
                "STARTER", "PLUS", "ELITE",
                name="subscription_tier",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "status",
            postgresql.ENUM(
                "TRIAL", "ACTIVE", "CANCELED", "EXPIRED",
                name="subscription_status",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "current_period_start",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "current_period_end",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column("mp_subscription_id", sa.String(length=80), nullable=True),
        sa.Column("mp_preapproval_id", sa.String(length=80), nullable=True),
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
    )

    # --- índices explícitos ---
    op.create_index(
        "ix_subscriptions_user_status", "subscriptions", ["user_id", "status"]
    )
    op.create_index(
        "ix_subscriptions_workspace_tier",
        "subscriptions",
        ["workspace_id", "tier"],
    )
    op.create_index(
        "ix_subscriptions_current_period_end",
        "subscriptions",
        ["current_period_end"],
    )
    op.create_index(
        "ix_subscriptions_deleted_at", "subscriptions", ["deleted_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_subscriptions_deleted_at", table_name="subscriptions")
    op.drop_index(
        "ix_subscriptions_current_period_end", table_name="subscriptions"
    )
    op.drop_index(
        "ix_subscriptions_workspace_tier", table_name="subscriptions"
    )
    op.drop_index("ix_subscriptions_user_status", table_name="subscriptions")
    op.drop_table("subscriptions")

    bind = op.get_bind()
    sa.Enum(name="subscription_status").drop(bind, checkfirst=True)
    sa.Enum(name="subscription_tier").drop(bind, checkfirst=True)
