"""add trade margin account movement

Revision ID: 0016_add_trade_margin_movement
Revises: 0015_create_account_movements
Create Date: 2026-09-26 00:00:00

Add the TRADE_MARGIN ledger movement for capital reserved when a trade opens.
Trade margin movements are negative, like withdrawals, because they deduct the
reserved binary investment or forex notional from the available account balance.
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0016_add_trade_margin_movement"
down_revision: str | None = "0015_create_account_movements"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_CONSTRAINT_NAME = "ck_account_movements_signed_amount"
_TABLE_NAME = "account_movements"


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        with op.get_context().autocommit_block():
            op.execute(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_enum e
                        JOIN pg_type t ON t.oid = e.enumtypid
                        WHERE t.typname = 'account_movement_type'
                          AND e.enumlabel = 'TRADE_MARGIN'
                    ) THEN
                        ALTER TYPE account_movement_type ADD VALUE 'TRADE_MARGIN';
                    END IF;
                END
                $$;
                """
            )

    op.drop_constraint(_CONSTRAINT_NAME, _TABLE_NAME, type_="check")
    op.create_check_constraint(
        _CONSTRAINT_NAME,
        _TABLE_NAME,
        "(movement_type = 'DEPOSIT' AND amount > 0) OR "
        "(movement_type IN ('WITHDRAWAL', 'TRADE_MARGIN') AND amount < 0)",
    )


def downgrade() -> None:
    trade_margin_count = op.get_bind().scalar(
        sa.text(
            "SELECT count(*) FROM account_movements "
            "WHERE movement_type = 'TRADE_MARGIN'"
        )
    )
    if trade_margin_count:
        raise RuntimeError(
            "Cannot downgrade account movement constraint while TRADE_MARGIN "
            "rows exist. Remove or migrate those rows first."
        )

    op.drop_constraint(_CONSTRAINT_NAME, _TABLE_NAME, type_="check")
    op.create_check_constraint(
        _CONSTRAINT_NAME,
        _TABLE_NAME,
        "(movement_type = 'DEPOSIT' AND amount > 0) OR "
        "(movement_type = 'WITHDRAWAL' AND amount < 0)",
    )
