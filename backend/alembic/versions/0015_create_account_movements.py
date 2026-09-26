"""create account_movements ledger table

Revision ID: 0015_create_account_movements
Revises: 0014_add_google_sub_to_users
Create Date: 2026-09-26 00:00:00

First financial-ledger vertical slice: immutable account movements for
successful funding and withdrawals. The signed ``amount`` stores deposits as
positive values and withdrawals as negative values; ``previous_balance`` and
``post_balance`` preserve the account balance transition observed by the
service transaction.
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0015_create_account_movements"
down_revision: str | None = "0014_add_google_sub_to_users"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    movement_type = postgresql.ENUM(
        "DEPOSIT",
        "WITHDRAWAL",
        name="account_movement_type",
    )
    bind = op.get_bind()
    movement_type.create(bind, checkfirst=True)

    op.create_table(
        "account_movements",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "account_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("trading_accounts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "movement_type",
            postgresql.ENUM(
                "DEPOSIT",
                "WITHDRAWAL",
                name="account_movement_type",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("previous_balance", sa.Numeric(10, 2), nullable=False),
        sa.Column("post_balance", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "(movement_type = 'DEPOSIT' AND amount > 0) OR "
            "(movement_type = 'WITHDRAWAL' AND amount < 0)",
            name="ck_account_movements_signed_amount",
        ),
    )
    op.create_index(
        "ix_account_movements_account_occurred",
        "account_movements",
        ["account_id", "occurred_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_account_movements_account_occurred",
        table_name="account_movements",
    )
    op.drop_table("account_movements")

    bind = op.get_bind()
    sa.Enum(name="account_movement_type").drop(bind, checkfirst=True)
