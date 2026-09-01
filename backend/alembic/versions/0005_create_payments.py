"""create payments table

Revision ID: 0005_create_payments
Revises: 0004_create_plan_tier_prices
Create Date: 2026-09-01 12:00:00

p0c: tabla ``payments`` para registrar los pagos reportados por
MercadoPago. Cada fila es un snapshot del momento del pago — la
fuente de verdad sigue siendo MP (``GET /v1/payments/{id}``).

Enum ``payment_status`` (PENDING | APPROVED | REJECTED | CANCELLED |
REFUNDED). FKs ``user_id`` (CASCADE) + ``subscription_id`` (SET NULL).
Índices sobre (user_id, status), subscription_id, y mp_payment_id (este
último único por la naturaleza del id de MP).
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005_create_payments"
down_revision: Union[str, None] = "0004_create_plan_tier_prices"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    payment_status = postgresql.ENUM(
        "PENDING",
        "APPROVED",
        "REJECTED",
        "CANCELLED",
        "REFUNDED",
        name="payment_status",
    )
    bind = op.get_bind()
    payment_status.create(bind, checkfirst=True)

    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("mp_payment_id", sa.String(length=80), nullable=False),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "subscription_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("subscriptions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "status",
            postgresql.ENUM(
                "PENDING",
                "APPROVED",
                "REJECTED",
                "CANCELLED",
                "REFUNDED",
                name="payment_status",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("amount_usd", sa.Numeric(10, 2), nullable=False),
        sa.Column("payer_email", sa.String(length=254), nullable=False),
        sa.Column("mp_created_at", sa.DateTime(timezone=True), nullable=False),
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
        sa.UniqueConstraint("mp_payment_id", name="uq_payments_mp_payment_id"),
    )

    op.create_index(
        "ix_payments_mp_payment_id", "payments", ["mp_payment_id"], unique=True
    )
    op.create_index(
        "ix_payments_user_status", "payments", ["user_id", "status"]
    )
    op.create_index(
        "ix_payments_subscription_id", "payments", ["subscription_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_payments_subscription_id", table_name="payments")
    op.drop_index("ix_payments_user_status", table_name="payments")
    op.drop_index("ix_payments_mp_payment_id", table_name="payments")
    op.drop_table("payments")

    bind = op.get_bind()
    sa.Enum(name="payment_status").drop(bind, checkfirst=True)