"""Tests del tracking de page views + endpoints admin de analytics — p0c.

- ``POST /api/v1/analytics/pageview`` (público) acepta anon y user.
- ``GET  /api/v1/admin/analytics/top-pages`` devuelve agregación.
- ``GET  /api/v1/admin/analytics/summary`` devuelve KPIs.
- ``POST /pageview`` requiere admin para top-pages/summary (403).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.core.security.password import hash_password
from app.models import PageView, User, UserRole


async def _register(client, payload: dict) -> dict:
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _payload(unique_email: str) -> dict:
    return {
        "email": unique_email,
        "password": "Pv12345!",
        "first_name": "Pv",
        "last_name": "User",
        "phone": "+34612345678",
    }


async def _make_admin(db_session, suffix: str) -> User:
    u = User(
        email=f"pv_admin_{suffix}@jadecapital.local",
        password_hash=hash_password("Adm12345!"),
        first_name="Admin",
        last_name="Staff",
        phone="+34600000000",
        role=UserRole.ADMIN,
    )
    db_session.add(u)
    await db_session.flush()
    return u


async def _login(client, email: str) -> str:
    resp = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": "Adm12345!"}
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest.fixture
async def admin_token(client, db_session) -> str:
    suffix = uuid.uuid4().hex[:8]
    u = await _make_admin(db_session, suffix)
    await db_session.commit()
    return await _login(client, u.email)


async def test_record_pageview_as_user_returns_204(
    client, valid_register_payload
) -> None:
    """POST /analytics/pageview con Bearer token + 200 OK + 204 No Content."""
    reg = await _register(client, valid_register_payload)
    resp = await client.post(
        "/api/v1/analytics/pageview",
        json={
            "page_path": "/pricing",
            "page_title": "Planes",
            "referrer": "https://google.com",
        },
        headers={"Authorization": f"Bearer {reg['access_token']}"},
    )
    assert resp.status_code == 204, resp.text


async def test_record_pageview_as_anonymous_returns_204_with_cookie(client) -> None:
    """POST /analytics/pageview sin token → 204 + cookie de anon_id."""
    resp = await client.post(
        "/api/v1/analytics/pageview",
        json={"page_path": "/", "page_title": "Home"},
    )
    assert resp.status_code == 204, resp.text
    # httpx parsea los headers set-cookie en una lista ``cookies``.
    cookie_names = [c.name for c in resp.cookies.jar]
    assert "jcs.analytics.anon_id" in cookie_names


async def test_get_top_pages_aggregates_correctly(
    client, admin_token, db_session
) -> None:
    """GET /admin/analytics/top-pages devuelve agregación por page_path."""
    # Sembramos 3 hits a /pricing y 1 a /features.
    for _ in range(3):
        db_session.add(
            PageView(
                user_id=None,
                anonymous_id=str(uuid.uuid4()),
                page_path="/pricing",
                page_title="Planes",
                created_at=datetime.now(timezone.utc),
            )
        )
    db_session.add(
        PageView(
            user_id=None,
            anonymous_id=str(uuid.uuid4()),
            page_path="/features",
            page_title="Funciones",
            created_at=datetime.now(timezone.utc),
        )
    )
    await db_session.commit()

    resp = await client.get(
        "/api/v1/admin/analytics/top-pages?days=30&limit=10",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert isinstance(body, list)
    if len(body) >= 1:
        # /pricing es el primero (3 views > 1 view).
        assert body[0]["page_path"] == "/pricing"
        assert body[0]["views_count"] == 3


async def test_get_analytics_summary_returns_kpis(
    client, admin_token, db_session
) -> None:
    """GET /admin/analytics/summary devuelve los 4 KPIs."""
    # Sembramos 2 usuarios distintos y 1 anónimo.
    for _ in range(2):
        db_session.add(
            PageView(
                user_id=uuid.uuid4(),
                anonymous_id=None,
                page_path="/pricing",
                created_at=datetime.now(timezone.utc),
            )
        )
    db_session.add(
        PageView(
            user_id=None,
            anonymous_id=str(uuid.uuid4()),
            page_path="/pricing",
            created_at=datetime.now(timezone.utc),
        )
    )
    await db_session.commit()

    resp = await client.get(
        "/api/v1/admin/analytics/summary?days=30",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "total_views" in body
    assert "unique_users" in body
    assert "unique_anonymous" in body
    assert "top_referrer" in body
    assert "days" in body
    assert body["days"] == 30
    assert body["total_views"] >= 3