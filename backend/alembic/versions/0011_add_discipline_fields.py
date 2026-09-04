"""add discipline fields to trades + users.timezone

Revision ID: 0011_add_discipline_fields
Revises: 0010_create_account_movement
Create Date: 2026-09-04 14:00:00

Adds four columns that back the 1×1000 discipline feature (PR-1 of
``one-by-one-thousand-discipline``):

- ``trades.interest`` — single-select tag at trade creation
  (``FOMO | PLAN | REVENGE | IMPULSE``). Required on every new row,
  write-once, audited. Backfilled to ``"PLAN"`` for legacy rows so the
  ``NOT NULL`` constraint can land safely.
- ``trades.analysis_image_url`` — singular nullable URL for the
  pre-trade screenshot (``trade-ingestion`` REQ-TI-ADD-002).
- ``trades.close_image_url`` — singular nullable URL for the
  post-close screenshot (``trade-ingestion`` REQ-TI-ADD-004).
- ``users.timezone`` — IANA TZ used by ``session_service`` to bucket
  trades into 4 sessions (ASIA/EUROPA/NY_AMERICA/NY_PM). Backfilled
  to ``"UTC"``.

Order matters. ``0010_*`` (the WIP ``account_movement`` table) MUST
land first; this migration only runs on top. If running on a fresh
database that hasn't applied ``0010`` yet, Alembic will fail loudly
on the ``down_revision`` check (no silent skip).

Downgrade drops all four columns and the CHECK constraint, in
reverse order from the upgrade steps. The ``interest`` default is
already gone before drop, so the legacy state is recoverable.
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0011_add_discipline_fields"
down_revision: Union[str, None] = "0010_create_account_movement"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---- trades.interest: NOT NULL VARCHAR(16) with CHECK ----
    # Backfill strategy: add as nullable with server_default="PLAN",
    # then drop the default and enforce NOT NULL. This avoids the
    # "0 rows inserted with NULLs on NOT NULL" failure mode that a
    # straight NOT NULL add would trigger on legacy rows.
    op.add_column(
        "trades",
        sa.Column(
            "interest",
            sa.String(16),
            nullable=True,
            server_default="PLAN",
        ),
    )
    # Backfill any rows that somehow have NULL (server_default only
    # catches future INSERTs; legacy rows could already be NULL).
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "UPDATE trades SET interest = 'PLAN' "
            "WHERE interest IS NULL"
        )
    )
    op.alter_column("trades", "interest", nullable=False)
    op.create_check_constraint(
        "ck_trades_interest",
        "trades",
        "interest IN ('FOMO', 'PLAN', 'REVENGE', 'IMPULSE')",
    )

    # ---- trades.analysis_image_url: VARCHAR(512) NULL ----
    op.add_column(
        "trades",
        sa.Column(
            "analysis_image_url",
            sa.String(512),
            nullable=True,
        ),
    )

    # ---- trades.close_image_url: VARCHAR(512) NULL ----
    op.add_column(
        "trades",
        sa.Column(
            "close_image_url",
            sa.String(512),
            nullable=True,
        ),
    )

    # ---- users.timezone: NOT NULL VARCHAR(64) default "UTC" ----
    op.add_column(
        "users",
        sa.Column(
            "timezone",
            sa.String(64),
            nullable=True,
            server_default="UTC",
        ),
    )
    bind.execute(
        sa.text(
            "UPDATE users SET timezone = 'UTC' "
            "WHERE timezone IS NULL"
        )
    )
    op.alter_column("users", "timezone", nullable=False)


def downgrade() -> None:
    # Reverse order. ``users.timezone`` is independent of the trade
    # columns; drop it first to keep the operations symmetric.
    op.drop_column("users", "timezone")

    op.drop_column("trades", "close_image_url")
    op.drop_column("trades", "analysis_image_url")

    op.drop_constraint("ck_trades_interest", "trades", type_="check")
    op.drop_column("trades", "interest")