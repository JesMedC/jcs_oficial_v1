"""account risk control mode

Revision ID: 0022_account_risk_control
Revises: 0021_workspace_risk_control_mode
Create Date: 2026-09-26 00:00:00

Moves the risk-control settings from workspace to per-account so
each account has its own session_ops_cap, daily_loss_pct, weekly_loss_pct,
monthly_loss_pct, and mutually exclusive risk_control_mode. The
discipline engine already buckets trades per account, so the workspace
columns were a leak that forced every account in a workspace to share
the same cap and loss thresholds.

Migration plan:

1. Add nullable columns to trading_accounts to receive the workspace values.
2. Backfill from workspaces: every account inherits its workspace's current
   settings (default risk_control_mode=operations when the workspace column
   is null on legacy rows).
3. Promote the new columns to NOT NULL with the same defaults the workspace
   columns had (risk_control_mode defaults to 'operations').
4. Drop the now-unused columns from workspaces.
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0022_account_risk_control"
down_revision: str | None = "0021_workspace_risk_control_mode"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_OPERATIONS = "operations"


def upgrade() -> None:
    # 1) Add nullable columns on trading_accounts.
    op.add_column(
        "trading_accounts",
        sa.Column("risk_control_mode", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "trading_accounts",
        sa.Column("session_ops_cap", sa.SmallInteger(), nullable=True),
    )
    op.add_column(
        "trading_accounts",
        sa.Column("daily_loss_pct", sa.Numeric(6, 2), nullable=True),
    )
    op.add_column(
        "trading_accounts",
        sa.Column("weekly_loss_pct", sa.Numeric(6, 2), nullable=True),
    )
    op.add_column(
        "trading_accounts",
        sa.Column("monthly_loss_pct", sa.Numeric(6, 2), nullable=True),
    )

    # 2) Backfill from workspaces. Workspaces created before 0021 have
    # risk_control_mode NULL; COALESCE gives them the legacy 'operations'
    # default so the per-account mirror is deterministic.
    op.execute(
        sa.text(
            """
            UPDATE trading_accounts AS a
            SET
                risk_control_mode = COALESCE(w.risk_control_mode, :ops_default),
                session_ops_cap = w.session_ops_cap,
                daily_loss_pct = w.daily_loss_pct,
                weekly_loss_pct = w.weekly_loss_pct,
                monthly_loss_pct = w.monthly_loss_pct
            FROM workspaces AS w
            WHERE a.workspace_id = w.id
            """
        ).bindparams(ops_default=_OPERATIONS)
    )

    # 3) Tighten the new columns to NOT NULL with the same defaults the
    # workspace columns carry. Any account created during the window where
    # these were nullable gets the legacy operations mode.
    op.execute(
        sa.text(
            "UPDATE trading_accounts SET risk_control_mode = :ops_default "
            "WHERE risk_control_mode IS NULL"
        ).bindparams(ops_default=_OPERATIONS)
    )
    op.alter_column(
        "trading_accounts",
        "risk_control_mode",
        existing_type=sa.String(length=32),
        nullable=False,
        server_default=_OPERATIONS,
    )

    # 4) Drop the now-unused columns from workspaces.
    op.drop_column("workspaces", "risk_control_mode")
    op.drop_column("workspaces", "session_ops_cap")
    op.drop_column("workspaces", "daily_loss_pct")
    op.drop_column("workspaces", "weekly_loss_pct")
    op.drop_column("workspaces", "monthly_loss_pct")


def downgrade() -> None:
    op.add_column(
        "workspaces",
        sa.Column(
            "risk_control_mode",
            sa.String(length=32),
            nullable=False,
            server_default=_OPERATIONS,
        ),
    )
    op.add_column(
        "workspaces",
        sa.Column("session_ops_cap", sa.SmallInteger(), nullable=True),
    )
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

    # Recreate the workspace defaults from the most common value per
    # workspace; legacy workspaces should keep the mode their accounts
    # had at downgrade time.
    op.execute(
        sa.text(
            """
            UPDATE workspaces AS w
            SET
                risk_control_mode = COALESCE(s.mode, :ops_default),
                session_ops_cap = s.session_ops_cap,
                daily_loss_pct = s.daily_loss_pct,
                weekly_loss_pct = s.weekly_loss_pct,
                monthly_loss_pct = s.monthly_loss_pct
            FROM (
                SELECT workspace_id,
                       MODE() WITHIN GROUP (ORDER BY risk_control_mode) AS mode,
                       MODE() WITHIN GROUP (ORDER BY session_ops_cap) AS session_ops_cap,
                       MODE() WITHIN GROUP (ORDER BY daily_loss_pct) AS daily_loss_pct,
                       MODE() WITHIN GROUP (ORDER BY weekly_loss_pct) AS weekly_loss_pct,
                       MODE() WITHIN GROUP (ORDER BY monthly_loss_pct) AS monthly_loss_pct
                FROM trading_accounts
                GROUP BY workspace_id
            ) AS s
            WHERE w.id = s.workspace_id
            """
        ).bindparams(ops_default=_OPERATIONS)
    )

    op.drop_column("trading_accounts", "monthly_loss_pct")
    op.drop_column("trading_accounts", "weekly_loss_pct")
    op.drop_column("trading_accounts", "daily_loss_pct")
    op.drop_column("trading_accounts", "session_ops_cap")
    op.drop_column("trading_accounts", "risk_control_mode")


__all__ = ["upgrade", "downgrade"]
