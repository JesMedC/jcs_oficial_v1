"""create page_views table

Revision ID: 0006_create_page_views
Revises: 0005_create_payments
Create Date: 2026-09-01 12:05:00

p0c: tabla ``page_views`` para tracking analítico. Una fila por cada
visita reportada por ``POST /api/v1/analytics/pageview``. Append-only
(sin ``updated_at``) — las filas nunca se modifican.

FK opcional a ``users.id`` (SET NULL): las visitas anónimas no tienen
user_id. Índices compuestos sobre (page_path, created_at),
(user_id, created_at), (anonymous_id, created_at), más un índice simple
sobre session_id.
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006_create_page_views"
down_revision: Union[str, None] = "0005_create_payments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "page_views",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("anonymous_id", sa.String(length=36), nullable=True),
        sa.Column("page_path", sa.String(length=200), nullable=False),
        sa.Column("page_title", sa.String(length=200), nullable=True),
        sa.Column("referrer", sa.String(length=500), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.Column("session_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_index(
        "ix_page_views_path_created", "page_views", ["page_path", "created_at"]
    )
    op.create_index(
        "ix_page_views_user_created", "page_views", ["user_id", "created_at"]
    )
    op.create_index(
        "ix_page_views_anon_created",
        "page_views",
        ["anonymous_id", "created_at"],
    )
    op.create_index("ix_page_views_session_id", "page_views", ["session_id"])


def downgrade() -> None:
    op.drop_index("ix_page_views_session_id", table_name="page_views")
    op.drop_index("ix_page_views_anon_created", table_name="page_views")
    op.drop_index("ix_page_views_user_created", table_name="page_views")
    op.drop_index("ix_page_views_path_created", table_name="page_views")
    op.drop_table("page_views")