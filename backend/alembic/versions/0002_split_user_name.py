"""split user name + add phone

Revision ID: 0002_split_user_name
Revises: 0001_init
Create Date: 2026-08-31 22:30:00

p0b.1a: ``users.name`` (String(80)) → ``first_name`` (String(80)) +
``last_name`` (String(80)) + ``phone`` (String(20)).

Decisiones de migration:
- Rename vía ``op.alter_column(new_column_name=...)`` — preserva índice
  y datos existentes.
- ``last_name`` se añade con ``server_default=''`` para que las filas
  pre-existentes satisfagan ``NOT NULL``. Tras la migración el default
  se quita (los registros nuevos deben traerlo siempre).
- ``phone`` se añade con el mismo patrón y un placeholder internacional
  para las filas pre-existentes hasta que el seed las reescriba con el
  número real (Demo / Admin / Jade).
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_split_user_name"
down_revision: Union[str, None] = "0001_init"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) name -> first_name (preserva tipo y datos).
    op.alter_column(
        "users",
        "name",
        new_column_name="first_name",
        existing_type=sa.String(length=80),
        existing_nullable=False,
    )

    # 2) last_name con NOT NULL + default '' para backfill de filas previas.
    op.add_column(
        "users",
        sa.Column(
            "last_name",
            sa.String(length=80),
            nullable=False,
            server_default="",
        ),
    )
    op.alter_column("users", "last_name", server_default=None)

    # 3) phone con NOT NULL + placeholder para filas previas. El seed
    # los reescribe con números reales tras la migración.
    op.add_column(
        "users",
        sa.Column(
            "phone",
            sa.String(length=20),
            nullable=False,
            server_default="+0000000000",
        ),
    )
    op.alter_column("users", "phone", server_default=None)


def downgrade() -> None:
    # Revertir el orden inverso: phone → last_name → first_name → name.
    op.alter_column(
        "users",
        "first_name",
        new_column_name="name",
        existing_type=sa.String(length=80),
        existing_nullable=False,
    )
    op.drop_column("users", "phone")
    op.drop_column("users", "last_name")
