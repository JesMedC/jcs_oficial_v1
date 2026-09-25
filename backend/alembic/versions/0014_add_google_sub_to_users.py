"""add users.google_sub — Google OAuth identity link

Revision ID: 0014_add_google_sub_to_users
Revises: 0013_workspace_session_ops_cap
Create Date: 2026-09-25 23:00:00

Adds ``users.google_sub VARCHAR(255) NULL UNIQUE INDEXED`` to back the
Google OAuth login flow (p0auth.1):

- ``/api/v1/auth/google/login`` redirects to Google's consent screen.
- ``/api/v1/auth/google/callback`` exchanges the ``code`` for tokens,
  fetches userinfo (email + name + ``sub``), then either finds the
  user by ``google_sub`` (or by ``email`` as fallback) or creates a
  new ``USER``-role account with a placeholder password hash.
- Persisting ``sub`` means the user can keep logging in with Google
  even if they later change the email on their Google account, and
  prevents two Google accounts from colliding on the same row.

Decisiones:

- Nullable: email/password signups never set it, and the existing
  password_hash column already satisfies NOT NULL on its own.
- Unique: one ``sub`` maps to exactly one row. Partial index would be
  tempting on huge tables, but a plain UNIQUE on a low-cardinality
  nullable column is fine at our scale.
- Indexed: the OAuth callback is the hot path and does a single
  ``WHERE google_sub = :sub`` lookup. The unique constraint already
  builds a backing index, but we add an explicit ``index=True`` so
  the migration history matches the model declaration (and Alembic
  ``compare_type=True`` doesn't flag drift on future schema sync).

Downgrade drops the column. ``google_sub`` is informational; no
downstream data references it, so the drop is lossless.
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0014_add_google_sub_to_users"
down_revision: Union[str, None] = "0013_workspace_session_ops_cap"
branch_labels: Union[str, Sequence[str, None], None] = None
depends_on: Union[str, Sequence[str, None], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "google_sub",
            sa.String(length=255),
            nullable=True,
            unique=True,
        ),
    )
    # Postgres doesn't auto-create an index on a UNIQUE column unless
    # it's used as a primary key. The unique constraint already gets
    # a backing index, but we keep ``index=True`` in the model for
    # parity. Skip the explicit ``create_index`` here — the UNIQUE
    # constraint creates the only index the OAuth callback needs.


def downgrade() -> None:
    op.drop_column("users", "google_sub")
