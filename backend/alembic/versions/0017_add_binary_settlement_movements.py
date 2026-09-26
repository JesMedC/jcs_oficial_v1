"""add binary settlement account movements

Revision ID: 0017_add_binary_settlement_movements
Revises: 0016_add_trade_margin_movement
Create Date: 2026-09-26 00:00:00

Add positive binary settlement movement types. TRADE_RETURN records returned
investment on WIN/BREAK binary closes; TRADE_PROFIT records payout profit on
WIN closes. FOREX settlement movements are intentionally not represented yet.
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0017_add_binary_settlement_movements"
down_revision: str | None = "0016_add_trade_margin_movement"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_CONSTRAINT_NAME = "ck_account_movements_signed_amount"
_TABLE_NAME = "account_movements"
_SETTLEMENT_TYPES = ("TRADE_RETURN", "TRADE_PROFIT")


def _add_postgresql_enum_value(value: str) -> None:
    op.execute(
        f"""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_enum e
                JOIN pg_type t ON t.oid = e.enumtypid
                WHERE t.typname = 'account_movement_type'
                  AND e.enumlabel = '{value}'
            ) THEN
                ALTER TYPE account_movement_type ADD VALUE '{value}';
            END IF;
        END
        $$;
        """
    )


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        with op.get_context().autocommit_block():
            for movement_type in _SETTLEMENT_TYPES:
                _add_postgresql_enum_value(movement_type)

    op.drop_constraint(_CONSTRAINT_NAME, _TABLE_NAME, type_="check")
    op.create_check_constraint(
        _CONSTRAINT_NAME,
        _TABLE_NAME,
        "(movement_type IN ('DEPOSIT', 'TRADE_RETURN', 'TRADE_PROFIT') "
        "AND amount > 0) OR "
        "(movement_type IN ('WITHDRAWAL', 'TRADE_MARGIN') AND amount < 0)",
    )


def downgrade() -> None:
    settlement_count = op.get_bind().scalar(
        sa.text(
            "SELECT count(*) FROM account_movements "
            "WHERE movement_type IN ('TRADE_RETURN', 'TRADE_PROFIT')"
        )
    )
    if settlement_count:
        raise RuntimeError(
            "Cannot downgrade account movement constraint while binary "
            "settlement rows exist. Remove or migrate those rows first."
        )

    op.drop_constraint(_CONSTRAINT_NAME, _TABLE_NAME, type_="check")
    op.create_check_constraint(
        _CONSTRAINT_NAME,
        _TABLE_NAME,
        "(movement_type = 'DEPOSIT' AND amount > 0) OR "
        "(movement_type IN ('WITHDRAWAL', 'TRADE_MARGIN') AND amount < 0)",
    )
