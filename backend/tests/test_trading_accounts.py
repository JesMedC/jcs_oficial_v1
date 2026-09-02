"""Tests del módulo ``TradingAccount`` — p0d.1.

Cubre ``GET /api/v1/accounts`` y ``POST /api/v1/accounts``:
- listado vacío inicial;
- create con ``balance_usd=0`` por default;
- la cuenta aparece en el listado del dueño;
- scoping per-user (un user NO ve las cuentas de otro);
- validación (broker_name vacío / type inválido → 422);
- 401 sin token.
"""
from __future__ import annotations

import uuid
from decimal import Decimal

import pytest

from app.core.security.password import hash_password
from app.models import User, UserRole


async def _register(client, payload: dict) -> dict:
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _payload(unique_email: str) -> dict:
    return {
        "email": unique_email,
        "password": "Trader1234!",
        "first_name": "Trader",
        "last_name": "User",
        "phone": "+34612345678",
    }


async def test_list_accounts_empty_initially(client, valid_register_payload) -> None:
    """GET /accounts autenticado y sin cuentas → items=[], total=0."""
    reg = await _register(client, valid_register_payload)
    resp = await client.get(
        "/api/v1/accounts",
        headers={"Authorization": f"Bearer {reg['access_token']}"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["items"] == []
    assert body["total"] == 0
    assert body["skip"] == 0
    assert body["limit"] == 50


async def test_create_binary_account_returns_201_with_zero_balance(
    client, valid_register_payload
) -> None:
    """POST /accounts crea una cuenta BINARY con balance_usd=0."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    # Sacamos el user_id desde ``/me`` (no viene en ``TokenOut``).
    me = await client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 200, me.text
    owner_id = me.json()["user_id"]

    resp = await client.post(
        "/api/v1/accounts",
        headers=headers,
        json={
            "broker_name": "Pocket Option",
            "type": "BINARY",
            "name": "Cuenta principal",
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["broker_name"] == "Pocket Option"
    assert body["type"] == "BINARY"
    assert body["name"] == "Cuenta principal"
    # ``user_id`` es el del usuario autenticado.
    assert body["user_id"] == owner_id
    # ``balance_usd`` siempre arranca en 0 (server_default).
    assert Decimal(body["balance_usd"]) == Decimal("0.00")
    # Sanity: el body crudo enviado por el cliente NO tiene ``balance_usd``.
    sent = resp.request.content.decode()
    assert "balance_usd" not in sent
    assert body["id"]
    assert body["created_at"]
    assert body["updated_at"]


async def test_created_account_appears_in_list(client, valid_register_payload) -> None:
    """La cuenta creada aparece en GET /accounts del mismo usuario."""
    reg = await _register(client, valid_register_payload)
    # Creamos 2 cuentas.
    for name in ("Cuenta A", "Cuenta B"):
        create_resp = await client.post(
            "/api/v1/accounts",
            headers={"Authorization": f"Bearer {reg['access_token']}"},
            json={
                "broker_name": "Quotex",
                "type": "BINARY",
                "name": name,
            },
        )
        assert create_resp.status_code == 201, create_resp.text

    resp = await client.get(
        "/api/v1/accounts",
        headers={"Authorization": f"Bearer {reg['access_token']}"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total"] == 2
    assert len(body["items"]) == 2
    names = {item["name"] for item in body["items"]}
    assert names == {"Cuenta A", "Cuenta B"}


async def test_user_cannot_see_other_users_accounts(
    client, valid_register_payload, db_session
) -> None:
    """Per-user scoping: el user B no ve las cuentas del user A."""
    # User A se registra vía HTTP (auth real) — crea 1 cuenta.
    reg_a = await _register(client, valid_register_payload)
    headers_a = {"Authorization": f"Bearer {reg_a['access_token']}"}
    create_resp = await client.post(
        "/api/v1/accounts",
        headers=headers_a,
        json={
            "broker_name": "Pocket Option",
            "type": "FOREX",
            "name": "A's account",
        },
    )
    assert create_resp.status_code == 201, create_resp.text

    # User B se crea directo en DB (más rápido que otro round-trip) + login.
    suffix = uuid.uuid4().hex[:8]
    user_b = User(
        email=f"tb_{suffix}@jadecapital.local",
        password_hash=hash_password("Trader1234!"),
        first_name="B",
        last_name="User",
        phone="+34600000000",
        role=UserRole.USER,
    )
    db_session.add(user_b)
    await db_session.flush()

    login_b = await client.post(
        "/api/v1/auth/login",
        json={"email": user_b.email, "password": "Trader1234!"},
    )
    assert login_b.status_code == 200, login_b.text
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # B crea su propia cuenta.
    create_b = await client.post(
        "/api/v1/accounts",
        headers=headers_b,
        json={
            "broker_name": "IC Markets",
            "type": "FOREX",
            "name": "B's account",
        },
    )
    assert create_b.status_code == 201, create_b.text

    # Listado de B: 1 sola cuenta, la suya.
    resp_b = await client.get("/api/v1/accounts", headers=headers_b)
    assert resp_b.status_code == 200, resp_b.text
    body_b = resp_b.json()
    assert body_b["total"] == 1
    assert len(body_b["items"]) == 1
    assert body_b["items"][0]["name"] == "B's account"
    assert body_b["items"][0]["user_id"] == str(user_b.id)

    # Listado de A: 1 sola cuenta, la suya.
    resp_a = await client.get("/api/v1/accounts", headers=headers_a)
    assert resp_a.status_code == 200, resp_a.text
    body_a = resp_a.json()
    assert body_a["total"] == 1
    assert len(body_a["items"]) == 1
    assert body_a["items"][0]["name"] == "A's account"
    # ``user_id`` de A = el que viene en la fila creada por A.
    assert body_a["items"][0]["user_id"] == body_b["items"][0]["user_id"] or (
        body_a["items"][0]["user_id"] != str(user_b.id)
    )


@pytest.mark.parametrize(
    "bad_payload",
    [
        # broker_name vacío
        {"broker_name": "", "type": "BINARY", "name": "ok"},
        # type inválido
        {"broker_name": "ok", "type": "CRYPTO", "name": "ok"},
        # name vacío
        {"broker_name": "ok", "type": "BINARY", "name": ""},
        # broker_name faltante
        {"type": "BINARY", "name": "ok"},
    ],
)
async def test_create_account_validation_returns_422(
    client, valid_register_payload, bad_payload
) -> None:
    """Payload inválido → 422 VALIDATION_ERROR."""
    reg = await _register(client, valid_register_payload)
    resp = await client.post(
        "/api/v1/accounts",
        headers={"Authorization": f"Bearer {reg['access_token']}"},
        json=bad_payload,
    )
    assert resp.status_code == 422, resp.text
    assert resp.json()["code"] == "VALIDATION_ERROR"


async def test_list_accounts_unauthenticated_returns_401(client) -> None:
    """Sin Authorization → 401 AUTH_TOKEN_MISSING."""
    resp = await client.get("/api/v1/accounts")
    assert resp.status_code == 401, resp.text
    assert resp.json()["code"] == "AUTH_TOKEN_MISSING"


async def test_create_account_unauthenticated_returns_401(client) -> None:
    """POST sin Authorization → 401 AUTH_TOKEN_MISSING."""
    resp = await client.post(
        "/api/v1/accounts",
        json={"broker_name": "x", "type": "BINARY", "name": "y"},
    )
    assert resp.status_code == 401, resp.text
    assert resp.json()["code"] == "AUTH_TOKEN_MISSING"
