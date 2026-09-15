"""Alembic migration 0013 — workspaces.session_ops_cap backfill (REQ-DSC-001).

RED until T-004 lands: the migration doesn't exist yet, so the test
fails at the ``command.upgrade(...)`` step with
``Can't locate revision identified by '0013_workspace_session_ops_cap'``.

Strategy:
  1. Pre-create a minimal ``workspaces`` table in SQLite (matches the
     columns the 0013 ``UPDATE`` reads: ``plan_tier``).
  2. Pre-create the ``alembic_version`` row at ``0012_*`` so alembic
     accepts the 0013 upgrade.
  3. Run ``alembic upgrade 0013_workspace_session_ops_cap`` — adds
     the column + backfills per tier via ``_PLAN_CEILING_BY_TIER``.
  4. Assert per-tier values: STARTER=4, PRO=6, ELITE=10, NONE=NULL.
  5. Run ``alembic downgrade -1`` and assert the column is gone.
"""
from __future__ import annotations

import os
import tempfile
import uuid

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text


@pytest.fixture()
def _sqlite_migration_db(monkeypatch):
    """Provision a SQLite DB with a minimal ``workspaces`` table + an
    ``alembic_version`` row pinned at ``0012_*``.

    Yields the URL; tears the file down at the end.
    """
    db_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    db_file.close()
    url = f"sqlite:///{db_file.name}"
    engine = create_engine(url, future=True)

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE workspaces (
                    id VARCHAR(36) PRIMARY KEY,
                    name VARCHAR(80) NOT NULL,
                    owner_user_id VARCHAR(36) NOT NULL,
                    plan_tier VARCHAR(16) NOT NULL DEFAULT 'NONE'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE alembic_version (
                    version_num VARCHAR(32) NOT NULL PRIMARY KEY
                )
                """
            )
        )
        conn.execute(
            text(
                "INSERT INTO alembic_version (version_num) "
                "VALUES ('0012_extend_trade_type_with_fund_withdraw')"
            )
        )
        # Seed one workspace per known tier + one NONE that should
        # stay NULL after backfill.
        for tier in ("STARTER", "PRO", "ELITE", "NONE"):
            conn.execute(
                text(
                    "INSERT INTO workspaces "
                    "(id, name, owner_user_id, plan_tier) "
                    "VALUES (:id, :name, :owner, :tier)"
                ),
                {
                    "id": str(uuid.uuid4()),
                    "name": f"ws-{tier}",
                    "owner": str(uuid.uuid4()),
                    "tier": tier,
                },
            )

    monkeypatch.setenv("DATABASE_URL_SYNC", url)
    yield url, engine

    engine.dispose()
    os.unlink(db_file.name)


def _cfg(url: str) -> Config:
    cfg = Config("alembic.ini")
    cfg.set_main_option("sqlalchemy.url", url)
    return cfg


def test_migration_0013_backfills_session_ops_cap_per_tier(
    _sqlite_migration_db,
) -> None:
    """REQ-DSC-001 + REQ-DSC-002: column added + per-tier backfill.

    STARTER → 4, PRO → 6, ELITE → 10, NONE → NULL (fallback at runtime).
    """
    url, engine = _sqlite_migration_db
    cfg = _cfg(url)

    command.upgrade(cfg, "0013_workspace_session_ops_cap")

    with engine.connect() as conn:
        rows = list(
            conn.execute(
                text(
                    "SELECT plan_tier, session_ops_cap "
                    "FROM workspaces ORDER BY plan_tier"
                )
            )
        )

    caps = {row.plan_tier: row.session_ops_cap for row in rows}
    assert caps["STARTER"] == 4
    assert caps["PRO"] == 6
    assert caps["ELITE"] == 10
    # NONE workspaces stay NULL — the engine falls back to the
    # ``_PLAN_CEILING_FALLBACK`` (= 4) at runtime via ``plan_ceiling_for``.
    assert caps["NONE"] is None


def test_migration_0013_downgrade_drops_column(_sqlite_migration_db) -> None:
    """REQ-DSC-001: ``downgrade`` drops ``session_ops_cap``.

    The column must NOT survive the rollback; the workspaces table
    itself stays intact.
    """
    url, engine = _sqlite_migration_db
    cfg = _cfg(url)

    command.upgrade(cfg, "0013_workspace_session_ops_cap")
    command.downgrade(cfg, "0012_extend_trade_type_with_fund_withdraw")

    # Column must be gone; rows must still exist.
    with engine.connect() as conn:
        rows = list(conn.execute(text("SELECT name FROM workspaces")))
        assert len(rows) == 4

        # Querying the column should fail.
        import sqlite3

        try:
            list(
                conn.execute(text("SELECT session_ops_cap FROM workspaces"))
            )
            raise AssertionError("column should have been dropped")
        except sqlite3.OperationalError as exc:
            assert "no such column: session_ops_cap" in str(exc)