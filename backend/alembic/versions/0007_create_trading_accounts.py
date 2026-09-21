"""create trading_accounts table

Revision ID: 0007_create_trading_accounts
Revises: 0006_create_page_views
Create Date: 2026-09-01 14:00:00

p0d.1: tabla ``trading_accounts`` para que los usuarios autenticados
puedan registrar sus cuentas de trading (Binary o Forex) y listarlas
desde ``GET /api/v1/accounts``.

FK ``user_id`` (CASCADE) — si se borra el usuario, sus cuentas también.
Enum ``trading_account_type`` con valores ``BINARY`` | ``FOREX``.
``balance_usd`` arranca en 0 vía ``server_default``; el cliente nunca lo
puede setear en el POST (el service lo deja al default de la DB).
Índice simple sobre ``user_id`` para que el listado por usuario sea barato.
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0007_create_trading_accounts"
down_revision: Union[str, None] = "0006_create_page_views"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    trading_account_type = postgresql.ENUM(
        "BINARY",
        "FOREX",
        name="trading_account_type",
    )
    bind = op.get_bind()
    trading_account_type.create(bind, checkfirst=True)

    op.create_table(
        "trading_accounts",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("broker_name", sa.String(length=100), nullable=False),
        sa.Column(
            "type",
            postgresql.ENUM(
                "BINARY",
                "FOREX",
                name="trading_account_type",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column(
            "balance_usd",
            sa.Numeric(10, 2),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_index(
        "ix_trading_accounts_user_id", "trading_accounts", ["user_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_trading_accounts_user_id", table_name="trading_accounts")
    op.drop_table("trading_accounts")

    bind = op.get_bind()
    sa.Enum(name="trading_account_type").drop(bind, checkfirst=True)
