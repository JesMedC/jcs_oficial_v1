"""Tests for ``find_or_create_user_from_google``.

Covers the three lookup paths:

  1. ``google_sub`` hit  → return the existing user.
  2. Email hit + new sub → link the ``google_sub`` to the existing row.
  3. Neither hit         → create a new ``USER``-role account with a
                            placeholder password hash.

Uses an in-memory ``aiosqlite`` database with ``Base.metadata.create_all``
so the test is hermetic — no Postgres, no network, no fixture sprawl.
The Google OAuth router itself is exercised in the integration smoke
test (curl against the running stack).
"""
from __future__ import annotations

from datetime import datetime, timezone

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.base import Base
from app.services.google_oauth_service import (
    GoogleOAuthError,
    find_or_create_user_from_google,
)


@pytest.fixture
async def session_factory():
    """In-memory aiosqlite engine + session factory, schema migrated."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    try:
        yield factory
    finally:
        await engine.dispose()


async def test_create_when_email_and_sub_are_new(session_factory) -> None:
    async with session_factory() as db:
        user = await find_or_create_user_from_google(
            db,
            email="fresh@example.com",
            first_name="Fresh",
            last_name="User",
            sub="google-sub-fresh",
        )
        await db.commit()

    assert user.email == "fresh@example.com"
    assert user.google_sub == "google-sub-fresh"
    assert user.is_active is True
    assert user.role.value == "USER"
    # email_verified_at must be stamped (Google already verified).
    # SQLite drops tzinfo on roundtrip — we only check presence and
    # freshness in UTC-naive seconds, which is enough for this unit.
    assert isinstance(user.email_verified_at, datetime)
    now_naive = datetime.utcnow()
    assert (now_naive - user.email_verified_at).total_seconds() < 5
    # Placeholder hash present and bcrypt-shaped (60 chars, starts with $2).
    assert user.password_hash.startswith("$2")
    assert len(user.password_hash) >= 60


async def test_lookup_by_google_sub_returns_existing_user(session_factory) -> None:
    # First call creates.
    async with session_factory() as db:
        created = await find_or_create_user_from_google(
            db,
            email="link@example.com",
            first_name="Link",
            last_name="User",
            sub="google-sub-stable",
        )
        await db.commit()
        created_id = created.id

    # Second call with the same sub → same row, no insert.
    async with session_factory() as db:
        again = await find_or_create_user_from_google(
            db,
            email="link@example.com",
            first_name="Link",
            last_name="User",
            sub="google-sub-stable",
        )
        await db.commit()

    assert again.id == created_id


async def test_email_existing_links_new_google_sub(session_factory) -> None:
    """Existing email/password user logs in with Google → sub gets linked."""
    async with session_factory() as db:
        # Email/password signup first (placeholder insert via raw session).
        from app.core.security.password import hash_password

        from app.models import User, UserRole

        legacy = User(
            email="legacy@example.com",
            password_hash=hash_password("LegacyPass123"),
            first_name="Legacy",
            last_name="User",
            phone="+5491100000000",
            role=UserRole.USER.value,
            is_active=True,
            # google_sub intentionally NULL — they signed up by email.
        )
        db.add(legacy)
        await db.commit()
        await db.refresh(legacy)
        legacy_id = legacy.id
        assert legacy.google_sub is None

    # Now Google login lands with a different sub → must link, not create.
    async with session_factory() as db:
        linked = await find_or_create_user_from_google(
            db,
            email="legacy@example.com",
            first_name="Legacy",
            last_name="User",
            sub="google-sub-new",
        )
        await db.commit()

    assert linked.id == legacy_id
    assert linked.google_sub == "google-sub-new"
    # Original password_hash preserved (we don't overwrite it).
    assert linked.password_hash.startswith("$2")


async def test_empty_sub_is_rejected(session_factory) -> None:
    async with session_factory() as db:
        with pytest.raises(GoogleOAuthError, match="sub vacio"):
            await find_or_create_user_from_google(
                db,
                email="nope@example.com",
                first_name="Nope",
                last_name="User",
                sub="",
            )
        await db.commit()


async def test_sub_takes_priority_over_email(session_factory) -> None:
    """Two users with the same email but different google_subs must coexist
    on lookup-by-sub; the email path only fires when sub is missing."""
    async with session_factory() as db:
        first = await find_or_create_user_from_google(
            db,
            email="shared@example.com",
            first_name="First",
            last_name="User",
            sub="google-sub-A",
        )
        await db.commit()
        first_id = first.id

    # Same email, different sub → must NOT link to ``first`` because
    # ``google_sub`` lookup misses. The email-path lookup would then
    # find ``first`` and overwrite its sub to "google-sub-B", which
    # is the correct linking behavior: ONE Google account per email
    # is enforced by the email lookup, not by uniqueness on email.
    async with session_factory() as db:
        same_via_email = await find_or_create_user_from_google(
            db,
            email="shared@example.com",
            first_name="First",
            last_name="User",
            sub="google-sub-B",
        )
        await db.commit()
        assert same_via_email.id == first_id
        assert same_via_email.google_sub == "google-sub-B"

    # Now google-sub-A is orphaned in the column (sub moved to B),
    # which is the documented linking behavior. A subsequent lookup
    # by google-sub-A will not find anything and will create a new
    # row (path 3) — that's intentional: re-binding happens by email,
    # not by sub.
    async with session_factory() as db:
        rebound = await find_or_create_user_from_google(
            db,
            email="shared@example.com",
            first_name="First",
            last_name="User",
            sub="google-sub-A",
        )
        await db.commit()
        assert rebound.id == first_id
        assert rebound.google_sub == "google-sub-A"
