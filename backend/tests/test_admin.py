"""Tests del módulo admin — p0b.2.

Cubre:
- GET  /admin/users
- PATCH /admin/users/{id}
- GET  /admin/plans
- PATCH /admin/plans/{tier}

Más el guard ``require_admin`` (403 con ``FORBIDDEN_NOT_ADMIN`` para
usuarios con rol USER y 401 sin token).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal

import pytest
from sqlalchemy import select

from app.core.security.password import hash_password
from app.models import PlanTierPrice, User, UserRole


async def _register(client, payload: dict) -> dict:
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _payload(unique_email: str) -> dict:
    return {
        "email": unique_email,
        "password": "Admin1234!",
        "first_name": "Admin",
        "last_name": "User",
        "phone": "+34612345678",
    }


async def _make_admin_user(db_session, suffix: str) -> User:
    user = User(
        email=f"admin_{suffix}@jadecapital.local",
        password_hash=hash_password("Admin1234!"),
        first_name="Admin",
        last_name="Staff",
        phone="+34600000000",
        role=UserRole.ADMIN,
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user


async def _login_admin(client, email: str) -> str:
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Admin1234!"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest.fixture
async def admin_token(client, db_session) -> str:
    """Crea un admin en DB y devuelve su access token."""
    suffix = uuid.uuid4().hex[:8]
    user = await _make_admin_user(db_session, suffix)
    await db_session.commit()
    return await _login_admin(client, user.email)


async def test_list_users_as_admin(client, admin_token, db_session) -> None:
    """GET /admin/users devuelve 200 + items + total cuando hay un admin."""
    # Seed: 2 users normales + el admin ya creado por el fixture.
    for i in range(2):
        email = f"u{i}_{uuid.uuid4().hex[:6]}@jadecapital.local"
        await _register(
            client,
            {
                "email": email,
                "password": "User1234!",
                "first_name": f"User{i}",
                "last_name": "Test",
                "phone": "+34612345678",
            },
        )

    resp = await client.get(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "items" in body
    assert "total" in body
    assert body["total"] >= 3
    assert body["skip"] == 0
    assert body["limit"] == 50
    # Cada item trae current_subscription (puede ser None).
    for item in body["items"]:
        assert "current_subscription" in item
        assert "id" in item
        assert "email" in item
        assert "role" in item


async def test_list_users_as_user(client, valid_register_payload) -> None:
    """Un USER normal recibe 403 FORBIDDEN_NOT_ADMIN."""
    reg = await _register(client, valid_register_payload)
    user_token = reg["access_token"]

    resp = await client.get(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 403, resp.text
    body = resp.json()
    assert body["code"] == "FORBIDDEN_NOT_ADMIN"


async def test_list_users_anonymous(client) -> None:
    """Sin token → 401 AUTH_TOKEN_MISSING."""
    resp = await client.get("/api/v1/admin/users")
    assert resp.status_code == 401
    assert resp.json()["code"] == "AUTH_TOKEN_MISSING"


async def test_set_user_active_happy(client, admin_token, db_session) -> None:
    """PATCH /admin/users/{id} con is_active=False → 200 + user.is_active=False."""
    target_email = f"target_{uuid.uuid4().hex[:6]}@jadecapital.local"
    await _register(
        client,
        {
            "email": target_email,
            "password": "Target1234!",
            "first_name": "Target",
            "last_name": "User",
            "phone": "+34612345678",
        },
    )
    # Recupero el id del target directamente desde DB.
    target_user = await db_session.scalar(
        select(User).where(User.email == target_email)
    )
    assert target_user is not None
    target_user_id = target_user.id

    resp = await client.patch(
        f"/api/v1/admin/users/{target_user_id}",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["is_active"] is False

    # Reactivar para no dejar residuos.
    resp2 = await client.patch(
        f"/api/v1/admin/users/{target_user_id}",
        json={"is_active": True},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp2.status_code == 200
    assert resp2.json()["is_active"] is True


async def test_set_user_active_unhappy(client, admin_token) -> None:
    """Admin intenta desactivarse a sí mismo → 403 ADMINAC_CANNOT_DEACTIVATE_SELF."""
    # Necesitamos conocer el user_id del admin actual. Lo leemos vía /auth/me.
    me = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert me.status_code == 200
    admin_user_id = me.json()["user_id"]

    resp = await client.patch(
        f"/api/v1/admin/users/{admin_user_id}",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 403
    body = resp.json()
    assert body["code"] == "ADMINAC_CANNOT_DEACTIVATE_SELF"


async def test_list_plans(client, admin_token, db_session) -> None:
    """GET /admin/plans devuelve 200 + 3 planes seeded (Starter/Plus/Elite)."""
    # Aseguramos las 3 filas activas (por si la DB es nueva).
    from app.models.subscription import SubscriptionTier
    from app.scripts.seed import PLAN_TIER_PRICES

    now = datetime.now(timezone.utc)
    for spec in PLAN_TIER_PRICES:
        existing = await db_session.scalar(
            select(PlanTierPrice).where(
                PlanTierPrice.tier == spec["tier"],
                PlanTierPrice.is_active.is_(True),
            )
        )
        if existing is None:
            row = PlanTierPrice(
                tier=spec["tier"],
                price_usd=spec["price_usd"],
                billing_period_days=30,
                is_active=True,
                effective_from=now,
                effective_until=None,
            )
            db_session.add(row)
    await db_session.commit()

    resp = await client.get(
        "/api/v1/admin/plans",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert isinstance(body, list)
    assert len(body) >= 3
    tiers = {row["tier"] for row in body}
    assert {"STARTER", "PLUS", "ELITE"}.issubset(tiers)


async def test_update_plan_price_happy(client, admin_token, db_session) -> None:
    """PATCH /admin/plans/PLUS con price_usd=12.99 → 200 + nueva fila activa."""
    from app.models.subscription import SubscriptionTier

    # Sembramos la fila PLUS activa si no existe.
    now = datetime.now(timezone.utc)
    plus_row = await db_session.scalar(
        select(PlanTierPrice).where(
            PlanTierPrice.tier == SubscriptionTier.PLUS,
            PlanTierPrice.is_active.is_(True),
        )
    )
    if plus_row is None:
        plus_row = PlanTierPrice(
            tier=SubscriptionTier.PLUS,
            price_usd=Decimal("9.99"),
            billing_period_days=30,
            is_active=True,
            effective_from=now,
            effective_until=None,
        )
        db_session.add(plus_row)
        await db_session.commit()
        await db_session.refresh(plus_row)
    plus_row_id_before = plus_row.id

    resp = await client.patch(
        "/api/v1/admin/plans/PLUS",
        json={"price_usd": "12.99"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert Decimal(body["price_usd"]) == Decimal("12.99")
    assert body["tier"] == "PLUS"
    assert body["is_active"] is True
    assert body["effective_until"] is None
    new_id = uuid.UUID(body["id"])
    assert new_id != plus_row_id_before

    # El PLUS anterior ahora está inactivo.
    db_session.expire_all()
    old = await db_session.get(PlanTierPrice, plus_row_id_before)
    assert old is not None
    assert old.is_active is False
    assert old.effective_until is not None

    # Volvemos a su precio original para no contaminar los demás tests.
    restore = await client.patch(
        "/api/v1/admin/plans/PLUS",
        json={"price_usd": "9.99"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert restore.status_code == 200


async def test_update_plan_price_invalid(client, admin_token) -> None:
    """PATCH con price_usd negativo → 422 ADMINAC_INVALID_PRICE (Decimal Pydantic ge=0)."""
    resp = await client.patch(
        "/api/v1/admin/plans/PLUS",
        json={"price_usd": "-5"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 422
    body = resp.json()
    # Pydantic rechaza en ge=0 — el code es VALIDATION_ERROR (no ADMINAC_INVALID_PRICE).
    assert body["code"] == "VALIDATION_ERROR"


async def test_admin_endpoints_require_admin(client, valid_register_payload) -> None:
    """Cualquier endpoint admin con rol USER → 403 FORBIDDEN_NOT_ADMIN."""
    reg = await _register(client, valid_register_payload)
    user_token = reg["access_token"]
    headers = {"Authorization": f"Bearer {user_token}"}

    r1 = await client.get("/api/v1/admin/users", headers=headers)
    assert r1.status_code == 403
    assert r1.json()["code"] == "FORBIDDEN_NOT_ADMIN"

    r2 = await client.get("/api/v1/admin/plans", headers=headers)
    assert r2.status_code == 403
    assert r2.json()["code"] == "FORBIDDEN_NOT_ADMIN"
