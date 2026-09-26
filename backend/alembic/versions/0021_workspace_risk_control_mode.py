"""workspace risk control mode

Revision ID: 0021_workspace_risk_control_mode
Revises: 0020_workspace_loss_limits
Create Date: 2026-09-26 00:00:00

Adds the mutually exclusive discipline mode selector. Existing rows
backfill to operations mode to preserve session-cap behaviour.
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0021_workspace_risk_control_mode"
down_revision: str | None = "0020_workspace_loss_limits"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_OPERATIONS = "operations"


def upgrade() -> None:
    op.add_column(
        "workspaces",
        sa.Column(
            "risk_control_mode",
            sa.String(length=32),
            nullable=False,
            server_default=_OPERATIONS,
        ),
    )


def downgrade() -> None:
    op.drop_column("workspaces", "risk_control_mode")


__all__ = ["upgrade", "downgrade"]
