"""workspace realized loss limit settings

Revision ID: 0020_workspace_loss_limits
Revises: 0019_expand_alembic_version_column
Create Date: 2026-09-26 00:00:00

Adds nullable Decimal percentage settings for realized closed-trade
loss guards. NULL keeps the guard disabled for existing workspaces.
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0020_workspace_loss_limits"
down_revision: str | None = "0019_expand_alembic_version_column"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "workspaces",
        sa.Column("daily_loss_pct", sa.Numeric(6, 2), nullable=True),
    )
    op.add_column(
        "workspaces",
        sa.Column("weekly_loss_pct", sa.Numeric(6, 2), nullable=True),
    )
    op.add_column(
        "workspaces",
        sa.Column("monthly_loss_pct", sa.Numeric(6, 2), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("workspaces", "monthly_loss_pct")
    op.drop_column("workspaces", "weekly_loss_pct")
    op.drop_column("workspaces", "daily_loss_pct")


__all__ = ["upgrade", "downgrade"]
