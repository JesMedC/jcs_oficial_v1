"""Tests de los endpoints /api/v1/subscriptions.

p0b.1a:
- GET /me → subscripción del usuario (TRIAL al registrarse).
- POST /upgrade → checkout_url + mp_preference_id (PLACEHOLDER).
- POST /cancel → marca la sub como CANCELED.

Los tests usan ``aiosqlite`` en memoria; el seed de MercadoPago real
se stubea en p0c.

p0c:
- ``POST /upgrade`` ya NO devuelve placeholder — si MP no está
  configurado, devuelve 422 ``MP_NOT_CONFIGURED``. El happy path con
  MP mockeado vive en ``test_subscription_upgrade_mp_sdk.py``.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest


async def _register(client, payload: dict) -> dict:
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _payload(unique_email: str) -> dict:
    return {
        "email": unique_email,
        "password": "Sub1234!",
        "first_name": "Sub",
        "last_name": "User",
        "phone": "+34612345678",
    }


async def test_me_includes_current_subscription(client, unique_email: str) -> None:
    """GET /me devuelve current_subscription con tier=STARTER, status=TRIAL,
    current_period_end ~ 7 días en el futuro."""
    reg = await _register(client, _payload(unique_email))
    access = reg["access_token"]

    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access}"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["current_subscription"] is not None
    sub = body["current_subscription"]
    assert sub["tier"] == "STARTER"
    assert sub["status"] == "TRIAL"
    # 7-day window — aceptamos un margen para timers lentos.
    end = datetime.fromisoformat(sub["current_period_end"])
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    delta = end - now
    assert timedelta(days=6, hours=23) < delta < timedelta(days=7, hours=1)


async def test_get_my_subscription_returns_trial(client, unique_email: str) -> None:
    """GET /subscriptions/me devuelve la subscripción recién creada."""
    reg = await _register(client, _payload(unique_email))
    access = reg["access_token"]

    resp = await client.get(
        "/api/v1/subscriptions/me",
        headers={"Authorization": f"Bearer {access}"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["tier"] == "STARTER"
    assert body["status"] == "TRIAL"


async def test_get_my_subscription_404_when_none(client) -> None:
    """Sin subscripción activa → 404 con envelope SUBSCRIPTION_NOT_FOUND.

    Aquí validamos que el endpoint requiere autenticación. El caso 404
    requiere un usuario sin sub, no posible vía /register porque crea
    el trial automáticamente.
    """
    resp = await client.get("/api/v1/subscriptions/me")
    assert resp.status_code == 401
    assert resp.json()["code"] == "AUTH_TOKEN_MISSING"


@pytest.mark.parametrize("target_tier", ["PLUS", "ELITE"])
async def test_upgrade_without_mp_token_returns_422(
    client, unique_email: str, target_tier: str, monkeypatch
) -> None:
    """POST /upgrade sin MERCADOPAGO_ACCESS_TOKEN → 422 MP_NOT_CONFIGURED.

    p0c: el backend rechaza explícitamente en lugar de devolver una URL
    placeholder. El happy path con MP mockeado vive en
    ``test_subscription_upgrade_mp_sdk.py``.
    """
    # Nos aseguramos de que el SDK no esté configurado.
    monkeypatch.setenv("MERCADOPAGO_ACCESS_TOKEN", "")

    reg = await _register(client, _payload(unique_email))
    access = reg["access_token"]

    resp = await client.post(
        "/api/v1/subscriptions/upgrade",
        json={"tier": target_tier},
        headers={"Authorization": f"Bearer {access}"},
    )
    assert resp.status_code == 422, resp.text
    body = resp.json()
    assert body["code"] == "MP_NOT_CONFIGURED"
    # Nunca debe devolver una URL placeholder.
    assert "PLACEHOLDER" not in resp.text
    assert "mercadopago.com/checkout/v1/redirect" not in resp.text


async def test_upgrade_invalid_tier_rejected(client, unique_email: str) -> None:
    """Tier STARTER está prohibido en upgrade (es el trial inicial)."""
    reg = await _register(client, _payload(unique_email))
    access = reg["access_token"]

    resp = await client.post(
        "/api/v1/subscriptions/upgrade",
        json={"tier": "STARTER"},
        headers={"Authorization": f"Bearer {access}"},
    )
    assert resp.status_code == 422
    body = resp.json()
    assert body["code"] == "VALIDATION_ERROR"


async def test_upgrade_extra_field_rejected(client, unique_email: str) -> None:
    """Campos extra están prohibidos por ``extra='forbid'``."""
    reg = await _register(client, _payload(unique_email))
    access = reg["access_token"]

    resp = await client.post(
        "/api/v1/subscriptions/upgrade",
        json={"tier": "PLUS", "extra": "no"},
        headers={"Authorization": f"Bearer {access}"},
    )
    assert resp.status_code == 422


async def test_cancel_subscription(client, unique_email: str) -> None:
    """POST /subscriptions/cancel marca la sub como CANCELED."""
    reg = await _register(client, _payload(unique_email))
    access = reg["access_token"]

    cancel = await client.post(
        "/api/v1/subscriptions/cancel",
        headers={"Authorization": f"Bearer {access}"},
    )
    assert cancel.status_code == 200, cancel.text
    body = cancel.json()
    assert body["status"] == "CANCELED"
    assert body["tier"] == "STARTER"
    assert uuid.UUID(body["subscription_id"])

    # /subscriptions/me debe seguir devolviendo la sub, ahora CANCELED.
    me = await client.get(
        "/api/v1/subscriptions/me",
        headers={"Authorization": f"Bearer {access}"},
    )
    assert me.status_code == 200
    assert me.json()["status"] == "CANCELED"


async def test_subscriptions_me_requires_token(client) -> None:
    resp = await client.get("/api/v1/subscriptions/me")
    assert resp.status_code == 401
    assert resp.json()["code"] == "AUTH_TOKEN_MISSING"


async def test_upgrade_requires_token(client) -> None:
    resp = await client.post(
        "/api/v1/subscriptions/upgrade", json={"tier": "PLUS"}
    )
    assert resp.status_code == 401
    assert resp.json()["code"] == "AUTH_TOKEN_MISSING"


async def test_cancel_requires_token(client) -> None:
    resp = await client.post("/api/v1/subscriptions/cancel")
    assert resp.status_code == 401
    assert resp.json()["code"] == "AUTH_TOKEN_MISSING"
