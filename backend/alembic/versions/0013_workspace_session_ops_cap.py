"""workspace.session_ops_cap — per-tier discipline cap setting

Revision ID: 0013_workspace_session_ops_cap
Revises: 0012_extend_trade_type_with_fund_withdraw
Create Date: 2026-09-15 12:00:00

REQ-DSC-001 + REQ-DSC-002: adds a nullable ``SMALLINT`` column to
``workspaces`` and backfills every row to its plan-tier ceiling:

  STARTER → 4
  PRO     → 6
  ELITE   → 10
  NONE    → NULL (runtime falls back to ``_PLAN_CEILING_FALLBACK``)

The single source of truth is ``_PLAN_CEILING_BY_TIER`` in
``app.services.discipline_engine`` — migration + engine + PATCH
endpoint all import the same constant so a tier change is a
one-dict edit. The migration imports it eagerly (top-level) so
``add_column`` and ``op.execute`` both see the same values.

Why no DB-level CHECK? The cap is plan-tier-aware (``ELITE`` may use
``10`` while ``STARTER`` is capped at ``4``); a flat
``BETWEEN 1 AND 10`` CHECK would not express that. App-level
validation in ``PATCH /api/v1/workspaces/{id}/discipline`` enforces
``1 <= value <= plan_ceiling_for(workspace.plan_tier)``.

``downgrade`` drops the column. The 4-ops-per-session fallback
(``_SESSION_OPS_CAP_FALLBACK = 4``) takes over automatically because
``Workspace.session_ops_cap`` is nullable and the engine reads
``or plan_ceiling_for(workspace.plan_tier)`` — no data loss.
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# ``_PLAN_CEILING_BY_TIER`` is the single source of truth — migration,
# engine, and PATCH endpoint all import from
# ``app.services.discipline_engine``. Keep this import at module
# level so the ``op.execute`` loop below sees the same dict the
# runtime engine sees.
from app.services.discipline_engine import _PLAN_CEILING_BY_TIER

revision: str = "0013_workspace_session_ops_cap"
down_revision: Union[str, None] = "0011_add_discipline_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add nullable (no default — backfill below sets real values).
    op.add_column(
        "workspaces",
        sa.Column("session_ops_cap", sa.SmallInteger(), nullable=True),
    )
    # Per-tier backfill in a single transaction. ``_PLAN_CEILING_BY_TIER``
    # is ``{STARTER:4, PRO:6, ELITE:10}`` at the time of this migration;
    # adding a new tier requires only an edit to that dict.
    for tier, cap in _PLAN_CEILING_BY_TIER.items():
        op.execute(
            f"UPDATE workspaces SET session_ops_cap = {int(cap)} "
            f"WHERE plan_tier = '{tier.value}'"
        )


def downgrade() -> None:
    op.drop_column("workspaces", "session_ops_cap")


__all__ = ["upgrade", "downgrade"]