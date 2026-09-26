"""Allow long Alembic revision identifiers.

Revision ID: 0019_expand_alembic_version_column
Revises: 0018_signed_forex_profit_movement
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0019_expand_alembic_version_column"
down_revision: str | None = "0018_signed_forex_profit_movement"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "alembic_version",
        "version_num",
        existing_type=sa.String(length=32),
        type_=sa.String(length=128),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "alembic_version",
        "version_num",
        existing_type=sa.String(length=128),
        type_=sa.String(length=32),
        existing_nullable=False,
    )
