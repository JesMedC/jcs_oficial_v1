"""create trades table

Revision ID: 0008_create_trades
Revises: 0007_create_trading_accounts
Create Date: 2026-09-02 10:00:00

p0e.4: tabla ``trades`` — registro de operaciones sobre las cuentas
de trading del usuario (módulo ``TradingAccount``). Un ``Trade``
representa una operación completa ``open → close``: por eso tiene
``opened_at`` y ``closed_at`` + ``status`` (OPEN | CLOSED_WIN |
CLOSED_LOSS | CLOSED_BREAK) + ``pnl_usd`` que se computa al cerrar y
dispara la mutación del ``balance_usd`` de la ``TradingAccount``.

Tipos de trade (segun el ``TradingAccount.type``):
- ``FOREX`` — campos ``pair``/``lot_size``/``entry_price``/``stop_loss``
  /``take_profit``/``exit_price``/``pnl_usd``/``risk_amount_usd``
  /``risk_pct``/``r_multiple`` + ``direction`` ∈ {LONG, SHORT}.
- ``BINARY`` — campos ``investment_usd``/``payout_pct``/``expiration_seconds``
  /``pnl_usd`` + ``direction`` ∈ {CALL, PUT}.

La columna ``direction`` es única y compartida entre los dos tipos
(módulo D podría dividirla en columnas separadas; acá se mantiene
unificada como pide el spec). Por eso los enums Postgres
``forex_direction`` y ``binary_direction`` se crean en la migración
para reservar el espacio de tipos pero la columna Postgres real es
``String`` con validación Python en el service layer (el spec permite
``CHECK constraint`` o ``validación Python`` — vamos por la segunda
para no duplicar reglas que ya viven en el service).

FKs:
- ``user_id`` (CASCADE) — si el usuario se borra, sus trades también.
- ``account_id`` (CASCADE) — si la cuenta se borra, sus trades
  también (el soft-delete deja la fila).

``strategy_id`` queda nullable porque la tabla ``strategies`` (módulo D)
no existe aún. NO se crea acá por respeto al principio de un solo
responsabilidad por migración.

Índices (los 4 pedidos por el spec):
- ``(user_id, status)`` — filtra "mis trades abiertos/perdidos/ganados".
- ``(account_id, opened_at desc)`` — historial por cuenta, cronológico.
- ``(user_id, opened_at desc)`` — listado general por usuario.
- parcial sobre ``status='OPEN'`` — vista rápida de las posiciones
  vivas del usuario sin escanear todos los trades.
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0008_create_trades"
down_revision: Union[str, None] = "0007_create_trading_accounts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    trade_type = postgresql.ENUM("FOREX", "BINARY", name="trade_type")
    trade_status = postgresql.ENUM(
        "OPEN",
        "CLOSED_WIN",
        "CLOSED_LOSS",
        "CLOSED_BREAK",
        name="trade_status",
    )
    forex_direction = postgresql.ENUM("LONG", "SHORT", name="forex_direction")
    binary_direction = postgresql.ENUM("CALL", "PUT", name="binary_direction")
    bind = op.get_bind()
    trade_type.create(bind, checkfirst=True)
    trade_status.create(bind, checkfirst=True)
    forex_direction.create(bind, checkfirst=True)
    binary_direction.create(bind, checkfirst=True)

    op.create_table(
        "trades",
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
        sa.Column(
            "account_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("trading_accounts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("instrument", sa.String(length=50), nullable=False),
        sa.Column(
            "type",
            postgresql.ENUM(
                "FOREX",
                "BINARY",
                name="trade_type",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "status",
            postgresql.ENUM(
                "OPEN",
                "CLOSED_WIN",
                "CLOSED_LOSS",
                "CLOSED_BREAK",
                name="trade_status",
                create_type=False,
            ),
            nullable=False,
            server_default="OPEN",
        ),
        sa.Column(
            "opened_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("strategy_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("emotional_tags", postgresql.JSONB(), nullable=True),
        sa.Column("pre_trade_notes", sa.Text(), nullable=True),
        sa.Column("post_trade_notes", sa.Text(), nullable=True),
        sa.Column("followed_plan", sa.Boolean(), nullable=True),
        sa.Column("mistakes", sa.Text(), nullable=True),
        sa.Column("screenshots", postgresql.JSONB(), nullable=True),
        # FOREX-specific (nullable; el service valida que estén populadas
        # cuando ``type='FOREX'``, ver ``trade_service.open_trade``).
        sa.Column("pair", sa.String(length=20), nullable=True),
        sa.Column("lot_size", sa.Numeric(10, 4), nullable=True),
        sa.Column("direction", sa.String(length=10), nullable=True),
        sa.Column("entry_price", sa.Numeric(20, 8), nullable=True),
        sa.Column("stop_loss", sa.Numeric(20, 8), nullable=True),
        sa.Column("take_profit", sa.Numeric(20, 8), nullable=True),
        sa.Column("exit_price", sa.Numeric(20, 8), nullable=True),
        sa.Column("pnl_usd", sa.Numeric(12, 2), nullable=True),
        sa.Column("risk_amount_usd", sa.Numeric(12, 2), nullable=True),
        sa.Column("risk_pct", sa.Numeric(6, 2), nullable=True),
        sa.Column("r_multiple", sa.Numeric(6, 2), nullable=True),
        # BINARY-specific (nullable; el service valida para ``type='BINARY'``).
        sa.Column("investment_usd", sa.Numeric(10, 2), nullable=True),
        sa.Column("payout_pct", sa.Numeric(5, 2), nullable=True),
        sa.Column("expiration_seconds", sa.Integer(), nullable=True),
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
        "ix_trades_user_status", "trades", ["user_id", "status"]
    )
    op.create_index(
        "ix_trades_account_opened",
        "trades",
        ["account_id", sa.text("opened_at DESC")],
    )
    op.create_index(
        "ix_trades_user_opened",
        "trades",
        ["user_id", sa.text("opened_at DESC")],
    )
    op.create_index(
        "ix_trades_open",
        "trades",
        ["user_id"],
        postgresql_where=sa.text("status = 'OPEN'"),
    )


def downgrade() -> None:
    op.drop_index("ix_trades_open", table_name="trades")
    op.drop_index("ix_trades_user_opened", table_name="trades")
    op.drop_index("ix_trades_account_opened", table_name="trades")
    op.drop_index("ix_trades_user_status", table_name="trades")
    op.drop_table("trades")

    bind = op.get_bind()
    sa.Enum(name="binary_direction").drop(bind, checkfirst=True)
    sa.Enum(name="forex_direction").drop(bind, checkfirst=True)
    sa.Enum(name="trade_status").drop(bind, checkfirst=True)
    sa.Enum(name="trade_type").drop(bind, checkfirst=True)
