"""add workspace_id to trading_accounts + trades

Revision ID: 0009_add_workspace_id
Revises: 0008_create_trades
Create Date: 2026-09-02 05:30:00

Multi-tenant pivot (p0f.1): ``trading_accounts`` y ``trades`` dejan de
ser ``User``-level y pasan a ser ``Workspace``-level. Cada fila tiene
un ``workspace_id`` NOT NULL que apunta al workspace donde se creó.

Estrategia (``expand → migrate → contract``):

1. ``ALTER TABLE ADD COLUMN nullable=True`` — permite backfill sin
   romper filas existentes.
2. ``UPDATE ... FROM workspace_members`` — backfill usando la regla
   "OWNER del user dueño". Si un user tiene varios workspaces OWNER,
   gana el de menor ``created_at`` (estable, determinista).
3. Verificación de cobertura 0% NULLs antes del ``NOT NULL``.
4. ``ALTER COLUMN nullable=False`` — contract.
5. FK ON DELETE CASCADE — si el workspace se borra, sus cuentas y
   trades también. Coherente con la semántica multi-tenant.
6. Índices: se reemplazan los viejos ``(user_id, ...)`` por
   ``(workspace_id, ...)``. ``ix_trading_accounts_user_id`` y
   ``ix_trades_account_opened`` se conservan (siguen siendo útiles
   para rutas que filtran por user / por account dentro de ws).
   ``ix_trades_open`` (parcial ``status='OPEN'``) queda intacto — el
   plan no lo incluye en esta ola y migrarlo sería side effect sin
   spec explícita.

Si el paso de verificación encuentra NULLs después del UPDATE, la
migración ABORTA con un ``RuntimeError``. NO fuerza NOT NULL con
datos huérfanos: eso expondría el sistema a crashes y violación de
invariantes.

Downgrade deshace el orden inverso (drop FK → drop indexes → drop
columns). El ``workspace_id`` se pierde con la fila si el workspace
se borró en cascada — recuperable desde ``audit_logs`` si fuera
necesario en el futuro.
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0009_add_workspace_id"
down_revision: Union[str, None] = "0008_create_trades"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---- expand: add nullable columns ----
    op.add_column(
        "trading_accounts",
        sa.Column(
            "workspace_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.add_column(
        "trades",
        sa.Column(
            "workspace_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )

    # ---- migrate: backfill from workspace_members (OWNER) ----
    # Regla determinista: si el user tiene varios workspaces OWNER,
    # gana el más antiguo (``MIN(created_at)``). Esto evita que el
    # ORDER BY sin criterio del planner baraje filas y produzca
    # backfills distintos entre runs.
    conn = op.get_bind()

    conn.execute(
        sa.text(
            """
            UPDATE trading_accounts t
            SET workspace_id = src.workspace_id
            FROM (
                SELECT
                    wm.user_id,
                    (
                        SELECT wm2.workspace_id
                        FROM workspace_members wm2
                        WHERE wm2.user_id = wm.user_id
                          AND wm2.role = 'OWNER'
                        ORDER BY wm2.created_at ASC, wm2.workspace_id ASC
                        LIMIT 1
                    ) AS workspace_id
                FROM workspace_members wm
                WHERE wm.role = 'OWNER'
                GROUP BY wm.user_id
            ) AS src
            WHERE t.user_id = src.user_id
              AND t.workspace_id IS NULL
            """
        )
    )
    conn.execute(
        sa.text(
            """
            UPDATE trades t
            SET workspace_id = src.workspace_id
            FROM (
                SELECT
                    wm.user_id,
                    (
                        SELECT wm2.workspace_id
                        FROM workspace_members wm2
                        WHERE wm2.user_id = wm.user_id
                          AND wm2.role = 'OWNER'
                        ORDER BY wm2.created_at ASC, wm2.workspace_id ASC
                        LIMIT 1
                    ) AS workspace_id
                FROM workspace_members wm
                WHERE wm.role = 'OWNER'
                GROUP BY wm.user_id
            ) AS src
            WHERE t.user_id = src.user_id
              AND t.workspace_id IS NULL
            """
        )
    )

    # ---- verify: 0 NULLs antes del NOT NULL ----
    null_accounts = conn.execute(
        sa.text("SELECT COUNT(*) FROM trading_accounts WHERE workspace_id IS NULL")
    ).scalar() or 0
    null_trades = conn.execute(
        sa.text("SELECT COUNT(*) FROM trades WHERE workspace_id IS NULL")
    ).scalar() or 0

    if null_accounts or null_trades:
        # NO forzamos NOT NULL con datos huérfanos. El operador debe
        # resolverlo manualmente (crear workspaces/memberships para
        # esos users y re-correr la migración) antes de continuar.
        raise RuntimeError(
            "Backfill incompleto: "
            f"trading_accounts={null_accounts} NULLs, "
            f"trades={null_trades} NULLs. "
            "No se aplica NOT NULL hasta resolverlos."
        )

    # ---- contract: NOT NULL ----
    op.alter_column("trading_accounts", "workspace_id", nullable=False)
    op.alter_column("trades", "workspace_id", nullable=False)

    # ---- FKs ON DELETE CASCADE ----
    op.create_foreign_key(
        "fk_trading_accounts_workspace_id",
        "trading_accounts",
        "workspaces",
        ["workspace_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_trades_workspace_id",
        "trades",
        "workspaces",
        ["workspace_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # ---- índices nuevos (workspace-centric) ----
    op.create_index(
        "ix_trading_accounts_workspace_id",
        "trading_accounts",
        ["workspace_id"],
    )
    op.drop_index("ix_trades_user_status", table_name="trades")
    op.drop_index("ix_trades_user_opened", table_name="trades")
    op.create_index(
        "ix_trades_workspace_status",
        "trades",
        ["workspace_id", "status"],
    )
    op.create_index(
        "ix_trades_workspace_opened",
        "trades",
        ["workspace_id", sa.text("opened_at DESC")],
    )

    # ``ix_trading_accounts_user_id`` y ``ix_trades_account_opened``
    # se conservan por compat con queries existentes
    # (filter por user cuando es single-workspace; filter por account
    # dentro del workspace).


def downgrade() -> None:
    # Inverso estricto: drop FK → drop nuevos indexes → drop cols.
    op.drop_index("ix_trades_workspace_opened", table_name="trades")
    op.drop_index("ix_trades_workspace_status", table_name="trades")
    op.create_index(
        "ix_trades_user_opened",
        "trades",
        ["user_id", sa.text("opened_at DESC")],
    )
    op.create_index(
        "ix_trades_user_status", "trades", ["user_id", "status"]
    )
    op.drop_index("ix_trading_accounts_workspace_id", table_name="trading_accounts")

    op.drop_constraint(
        "fk_trades_workspace_id", "trades", type_="foreignkey"
    )
    op.drop_constraint(
        "fk_trading_accounts_workspace_id",
        "trading_accounts",
        type_="foreignkey",
    )

    op.drop_column("trades", "workspace_id")
    op.drop_column("trading_accounts", "workspace_id")
