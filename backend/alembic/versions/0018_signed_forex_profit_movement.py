"""allow signed forex trade profit movements

Revision ID: 0018_signed_forex_profit_movement
Revises: 0017_add_binary_settlement_movements
Create Date: 2026-09-26 00:00:00

Allow TRADE_PROFIT to represent signed non-zero P&L for FOREX closes while
keeping deposits and trade returns positive, and withdrawals and reserved trade
margin negative.
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0018_signed_forex_profit_movement"
down_revision: str | None = "0017_add_binary_settlement_movements"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_CONSTRAINT_NAME = "ck_account_movements_signed_amount"
_TABLE_NAME = "account_movements"


def upgrade() -> None:
    op.drop_constraint(_CONSTRAINT_NAME, _TABLE_NAME, type_="check")
    op.create_check_constraint(
        _CONSTRAINT_NAME,
        _TABLE_NAME,
        "(movement_type IN ('DEPOSIT', 'TRADE_RETURN') AND amount > 0) OR "
        "(movement_type IN ('WITHDRAWAL', 'TRADE_MARGIN') AND amount < 0) OR "
        "(movement_type = 'TRADE_PROFIT' AND amount != 0)",
    )


def downgrade() -> None:
    non_positive_profit_count = op.get_bind().scalar(
        sa.text(
            "SELECT count(*) FROM account_movements "
            "WHERE movement_type = 'TRADE_PROFIT' AND amount <= 0"
        )
    )
    if non_positive_profit_count:
        raise RuntimeError(
            "Cannot downgrade account movement constraint while non-positive "
            "TRADE_PROFIT rows exist. Remove or migrate those rows first."
        )

    op.drop_constraint(_CONSTRAINT_NAME, _TABLE_NAME, type_="check")
    op.create_check_constraint(
        _CONSTRAINT_NAME,
        _TABLE_NAME,
        "(movement_type IN ('DEPOSIT', 'TRADE_RETURN', 'TRADE_PROFIT') "
        "AND amount > 0) OR "
        "(movement_type IN ('WITHDRAWAL', 'TRADE_MARGIN') AND amount < 0)",
    )
