"""Tests del endpoint admin de pagos — p0c.

- ``GET /api/v1/admin/payments`` lista paginada con filtro por status.
- USER sin rol admin recibe 403 ``FORBIDDEN_NOT_ADMIN``.
"""
from __future__ import annotations

import uuid
from decimal import Decimal

import pytest
from sqlalchemy import select

from app.core.security.password import hash_password
from app.models import Payment, PaymentStatus, Subscription, SubscriptionStatus, SubscriptionTier, User, UserRole


async def _register(client, payload: dict) -> dict:
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _payload(unique_email: str) -> dict:
    return {
        "email": unique_email,
        "password": "Adm12345!",
        "first_name": "Adm",
        "last_name": "User",
        "phone": "+34612345678",
    }


async def _make_admin_user(db_session, suffix: str) -> User:
    user = User(
        email=f"admin_pay_{suffix}@jadecapital.local",
        password_hash=hash_password("Adm12345!"),
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


async def _login(client, email: str) -> str:
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Adm12345!"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest.fixture
async def admin_token(client, db_session) -> str:
    suffix = uuid.uuid4().hex[:8]
    user = await _make_admin_user(db_session, suffix)
    await db_session.commit()
    return await _login(client, user.email)


async def _seed_payment(
    db_session,
    *,
    user: User,
    subscription: Subscription | None,
    status: PaymentStatus,
    mp_payment_id: str,
) -> Payment:
    from datetime import datetime, timezone

    p = Payment(
        mp_payment_id=mp_payment_id,
        user_id=user.id,
        subscription_id=subscription.id if subscription is not None else None,
        status=status,
        amount_usd=Decimal("9.99"),
        payer_email=user.email,
        mp_created_at=datetime.now(timezone.utc),
    )
    db_session.add(p)
    await db_session.flush()
    return p


async def test_list_payments_as_admin_returns_seeded_rows(
    client, admin_token, db_session
) -> None:
    """GET /admin/payments como admin devuelve items + total."""
    # Sembramos un usuario regular con una subscription y un par de pagos.
    user = User(
        email=f"buyer_{uuid.uuid4().hex[:6]}@jadecapital.local",
        password_hash=hash_password("Buy12345!"),
        first_name="Buyer",
        last_name="User",
        phone="+34612345678",
        role=UserRole.USER,
    )
    db_session.add(user)
    await db_session.flush()
    sub = Subscription(
        user_id=user.id,
        workspace_id=uuid.uuid4(),  # placeholder — solo necesitamos la fila
        tier=SubscriptionTier.PLUS,
        status=SubscriptionStatus.ACTIVE,
        current_period_start=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
        current_period_end=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
    )
    db_session.add(sub)
    await db_session.flush()

    await _seed_payment(
        db_session, user=user, subscription=sub,
        status=PaymentStatus.APPROVED, mp_payment_id="pmt-1",
    )
    await _seed_payment(
        db_session, user=user, subscription=sub,
        status=PaymentStatus.REJECTED, mp_payment_id="pmt-2",
    )
    await db_session.commit()

    resp = await client.get(
        "/api/v1/admin/payments",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "items" in body
    assert "total" in body
    assert body["total"] >= 2
    mp_ids = {p["mp_payment_id"] for p in body["items"]}
    assert "pmt-1" in mp_ids
    assert "pmt-2" in mp_ids


async def test_list_payments_as_user_returns_403(client, valid_register_payload) -> None:
    """USER normal → 403 FORBIDDEN_NOT_ADMIN."""
    reg = await _register(client, valid_register_payload)
    resp = await client.get(
        "/api/v1/admin/payments",
        headers={"Authorization": f"Bearer {reg['access_token']}"},
    )
    assert resp.status_code == 403, resp.text
    assert resp.json()["code"] == "FORBIDDEN_NOT_ADMIN"


async def test_list_payments_with_status_filter(
    client, admin_token, db_session
) -> None:
    """``?status=APPROVED`` filtra por status."""
    user = User(
        email=f"filt_{uuid.uuid4().hex[:6]}@jadecapital.local",
        password_hash=hash_password("Filt12345!"),
        first_name="Filt",
        last_name="User",
        phone="+34612345678",
        role=UserRole.USER,
    )
    db_session.add(user)
    await db_session.flush()
    sub = Subscription(
        user_id=user.id,
        workspace_id=uuid.uuid4(),
        tier=SubscriptionTier.PLUS,
        status=SubscriptionStatus.ACTIVE,
        current_period_start=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
        current_period_end=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
    )
    db_session.add(sub)
    await db_session.flush()

    await _seed_payment(
        db_session, user=user, subscription=sub,
        status=PaymentStatus.APPROVED, mp_payment_id="flt-1",
    )
    await _seed_payment(
        db_session, user=user, subscription=sub,
        status=PaymentStatus.REJECTED, mp_payment_id="flt-2",
    )
    await _seed_payment(
        db_session, user=user, subscription=sub,
        status=PaymentStatus.CANCELLED, mp_payment_id="flt-3",
    )
    await db_session.commit()

    resp = await client.get(
        "/api/v1/admin/payments?status=APPROVED",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total"] >= 1
    for item in body["items"]:
        assert item["status"] == "APPROVED"