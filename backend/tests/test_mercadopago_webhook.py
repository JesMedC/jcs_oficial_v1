"""Tests del webhook de MercadoPago.

p0c: el endpoint público ``POST /api/v1/webhooks/mercadopago``:

1. Webhook con firma válida + payment ``approved`` → Subscription
   confirmada (status=ACTIVE, tier actualizado desde
   ``external_reference``).
2. Webhook con payment ``rejected`` → Subscription CANCELED.
3. Webhook con firma inválida → 401 ``MP_BAD_SIGNATURE``.
4. Webhook con el mismo ``data_id`` dos veces → no-op idempotente.
5. Webhook con ``external_reference`` desconocido → 200 ``received: true``
   pero la sub no cambia (lo ignoramos).

Los tests mockean ``MercadoPagoClient.get_payment`` para no pegarle a
la API real. La firma HMAC se valida inline con un secret conocido.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import patch

import pytest

from app.config import get_settings
from app.integrations.mercadopago import MercadoPagoClient


async def _register(client, payload: dict) -> dict:
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _payload(unique_email: str) -> dict:
    return {
        "email": unique_email,
        "password": "Wh12345!",
        "first_name": "Wh",
        "last_name": "User",
        "phone": "+34612345678",
    }


def _sign(secret: str, *, data_id: str, request_id: str, ts: str) -> str:
    manifest = f"id={data_id};request-id={request_id};ts={ts}"
    digest = hmac.new(
        secret.encode("utf-8"), manifest.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    return f"ts={ts},v1={digest}"


def _build_payment_payload(
    *, user_id: str, workspace_id: str, tier: str, mp_payment_id: str, status: str
) -> dict:
    return {
        "id": mp_payment_id,
        "status": status,
        "external_reference": f"subscription:{user_id}:{workspace_id}:{tier}",
        "transaction_amount": 9.99,
        "payer": {"email": "payer@jadecapital.local"},
        "date_created": datetime.now(timezone.utc).isoformat(),
    }


@pytest.fixture
def mp_secret(monkeypatch):
    """Activa MERCADOPAGO_ACCESS_TOKEN + MERCADOPAGO_WEBHOOK_SECRET con
    valores conocidos. El SDK se inicializa con el token y el handler
    puede llamar a ``get_payment`` (mockeado).
    """
    from app.config import get_settings as _gs

    secret = "test-webhook-secret-for-pytest-aaaaaaa"
    monkeypatch.setenv("MERCADOPAGO_ACCESS_TOKEN", "TEST_FAKE_TOKEN_FOR_WEBHOOK")
    monkeypatch.setenv("MERCADOPAGO_WEBHOOK_SECRET", secret)
    # Limpiamos el cache del singleton para que tome el nuevo valor.
    _gs.cache_clear()
    yield secret
    _gs.cache_clear()


async def test_webhook_approved_payment_upgrades_subscription(
    client, unique_email: str, db_session, mp_secret: str
) -> None:
    """Webhook approved → Subscription ACTIVE con tier actualizado."""
    # Necesitamos una sub vigente — register ya crea la TRIAL.
    reg = await _register(client, _payload(unique_email))
    # Sacamos el user_id y workspace_id vía DB (los endpoints admin
    # son privados, pero el user_id sale de /auth/me).
    me = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {reg['access_token']}"}
    )
    user_id = me.json()["user_id"]
    workspace_id = me.json()["workspaces"][0]["id"]

    mp_payment_id = "1234567890"
    ts = "1700000000"
    request_id = "req-test-approved"
    sig = _sign(mp_secret, data_id=mp_payment_id, request_id=request_id, ts=ts)

    payload = _build_payment_payload(
        user_id=user_id,
        workspace_id=workspace_id,
        tier="PLUS",
        mp_payment_id=mp_payment_id,
        status="approved",
    )

    with patch.object(
        MercadoPagoClient,
        "get_payment",
        AsyncMockReturn(payload),
    ):
        resp = await client.post(
            "/api/v1/webhooks/mercadopago",
            json={
                "type": "payment",
                "data_id": mp_payment_id,
                "action": "payment.created",
                "data": {"id": mp_payment_id},
            },
            headers={
                "x-signature": sig,
                "x-request-id": request_id,
            },
        )

    assert resp.status_code == 200, resp.text
    assert resp.json() == {"received": True}

    # La sub del user ahora tiene tier=PLUS.
    me2 = await client.get(
        "/api/v1/subscriptions/me",
        headers={"Authorization": f"Bearer {reg['access_token']}"},
    )
    assert me2.status_code == 200, me2.text
    assert me2.json()["tier"] == "PLUS"
    assert me2.json()["status"] == "ACTIVE"


async def test_webhook_rejected_payment_cancels_subscription(
    client, unique_email: str, db_session, mp_secret: str
) -> None:
    """Webhook rejected → Subscription CANCELED."""
    reg = await _register(client, _payload(unique_email))
    me = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {reg['access_token']}"}
    )
    user_id = me.json()["user_id"]
    workspace_id = me.json()["workspaces"][0]["id"]

    mp_payment_id = "9876543210"
    ts = "1700000000"
    request_id = "req-test-rejected"
    sig = _sign(mp_secret, data_id=mp_payment_id, request_id=request_id, ts=ts)

    payload = _build_payment_payload(
        user_id=user_id,
        workspace_id=workspace_id,
        tier="ELITE",
        mp_payment_id=mp_payment_id,
        status="rejected",
    )

    with patch.object(
        MercadoPagoClient,
        "get_payment",
        AsyncMockReturn(payload),
    ):
        resp = await client.post(
            "/api/v1/webhooks/mercadopago",
            json={
                "type": "payment",
                "data_id": mp_payment_id,
                "action": "payment.created",
                "data": {"id": mp_payment_id},
            },
            headers={
                "x-signature": sig,
                "x-request-id": request_id,
            },
        )

    assert resp.status_code == 200, resp.text
    # La sub queda CANCELED.
    me2 = await client.get(
        "/api/v1/subscriptions/me",
        headers={"Authorization": f"Bearer {reg['access_token']}"},
    )
    assert me2.json()["status"] == "CANCELED"


async def test_webhook_invalid_signature_returns_401(
    client, unique_email: str, mp_secret: str
) -> None:
    """Firma inválida → 401 MP_BAD_SIGNATURE."""
    resp = await client.post(
        "/api/v1/webhooks/mercadopago",
        json={
            "type": "payment",
            "data_id": "1",
            "action": "payment.created",
            "data": {"id": "1"},
        },
        headers={
            "x-signature": "ts=1,v1=0000000000000000000000000000000000000000000000000000000000000000",
            "x-request-id": "req-test-bad-sig",
        },
    )
    assert resp.status_code == 401, resp.text
    assert resp.json()["code"] == "MP_BAD_SIGNATURE"


async def test_webhook_same_payment_id_twice_is_idempotent(
    client, unique_email: str, db_session, mp_secret: str
) -> None:
    """El mismo ``data_id`` procesado dos veces no causa daño."""
    reg = await _register(client, _payload(unique_email))
    me = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {reg['access_token']}"}
    )
    user_id = me.json()["user_id"]
    workspace_id = me.json()["workspaces"][0]["id"]

    mp_payment_id = "5555555555"
    ts = "1700000000"
    request_id = "req-test-idemp"
    sig = _sign(mp_secret, data_id=mp_payment_id, request_id=request_id, ts=ts)

    payload = _build_payment_payload(
        user_id=user_id,
        workspace_id=workspace_id,
        tier="PLUS",
        mp_payment_id=mp_payment_id,
        status="approved",
    )

    headers = {
        "x-signature": sig,
        "x-request-id": request_id,
    }
    body = {
        "type": "payment",
        "data_id": mp_payment_id,
        "action": "payment.created",
        "data": {"id": mp_payment_id},
    }

    with patch.object(
        MercadoPagoClient,
        "get_payment",
        AsyncMockReturn(payload),
    ):
        r1 = await client.post(
            "/api/v1/webhooks/mercadopago", json=body, headers=headers
        )
        r2 = await client.post(
            "/api/v1/webhooks/mercadopago", json=body, headers=headers
        )

    assert r1.status_code == 200, r1.text
    assert r2.status_code == 200, r2.text
    # La sub sigue siendo ACTIVE con tier PLUS — no se duplicó.
    me2 = await client.get(
        "/api/v1/subscriptions/me",
        headers={"Authorization": f"Bearer {reg['access_token']}"},
    )
    assert me2.json()["tier"] == "PLUS"
    assert me2.json()["status"] == "ACTIVE"


async def test_webhook_unknown_external_reference_is_ignored(
    client, unique_email: str, db_session, mp_secret: str
) -> None:
    """``external_reference`` fuera de nuestro patrón → 200, no-op."""
    reg = await _register(client, _payload(unique_email))
    me = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {reg['access_token']}"}
    )
    user_id = me.json()["user_id"]
    tier_before = me.json()["current_subscription"]["tier"]

    mp_payment_id = "1111111111"
    ts = "1700000000"
    request_id = "req-test-unknown"
    sig = _sign(mp_secret, data_id=mp_payment_id, request_id=request_id, ts=ts)

    payload = {
        "id": mp_payment_id,
        "status": "approved",
        # No empieza con ``subscription:`` → ignorado.
        "external_reference": f"some-other-product:{user_id}",
        "transaction_amount": 9.99,
        "payer": {"email": "payer@jadecapital.local"},
        "date_created": datetime.now(timezone.utc).isoformat(),
    }

    with patch.object(
        MercadoPagoClient,
        "get_payment",
        AsyncMockReturn(payload),
    ):
        resp = await client.post(
            "/api/v1/webhooks/mercadopago",
            json={
                "type": "payment",
                "data_id": mp_payment_id,
                "action": "payment.created",
                "data": {"id": mp_payment_id},
            },
            headers={
                "x-signature": sig,
                "x-request-id": request_id,
            },
        )

    assert resp.status_code == 200, resp.text
    # La sub no cambia.
    me2 = await client.get(
        "/api/v1/subscriptions/me",
        headers={"Authorization": f"Bearer {reg['access_token']}"},
    )
    assert me2.json()["tier"] == tier_before


# --------- helper: async mock factory (funciona como AsyncMock) ---------


class AsyncMockReturn:
    """Mock de un método async que devuelve un valor fijo.

    El SDK de MP devuelve dicts (no corutinas), pero los envolvemos en
    ``await`` en el handler para mantener el contrato async.
    """

    def __init__(self, value):
        self._value = value

    async def __call__(self, *args, **kwargs):
        return self._value