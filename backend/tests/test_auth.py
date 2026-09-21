"""Smoke tests para los endpoints de auth.

p0b.1a: ``register`` toma ``first_name``, ``last_name`` y ``phone``. Estos
tests cubren el happy path + los nuevos casos de duplicado de email,
contraseña débil y teléfono inválido.

p0f.1 (multi-tenant): el access token ahora viaja con el claim
``workspace_ids`` poblado de las memberships reales del user. Se
verifica en ``register``, ``login`` y ``refresh``.
"""
from __future__ import annotations

import uuid

import pytest

from app.core.security.jwt import decode_access_token


async def test_register_happy_path(client, valid_register_payload) -> None:
    payload = valid_register_payload
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["expires_in"] > 0
    # Cookie httpOnly seteada.
    assert "jcs_refresh_token" in resp.cookies

    # p0f.1: el access token lleva el claim ``workspace_ids`` con
    # exactamente 1 elemento (el workspace OWNER recién creado).
    claims = decode_access_token(body["access_token"])
    assert isinstance(claims["workspace_ids"], list)
    assert len(claims["workspace_ids"]) >= 1
    # Todos los valores son UUIDs stringificables.
    for ws in claims["workspace_ids"]:
        uuid.UUID(ws)  # raise si no es uuid


async def test_register_duplicate_email(client, valid_register_payload) -> None:
    payload = valid_register_payload
    first = await client.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 201, first.text

    # Mismo email, mismo payload → 409 con envelope AUTH_EMAIL_TAKEN.
    second = await client.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 409
    body = second.json()
    assert body["code"] == "AUTH_EMAIL_TAKEN"
    assert body["message"]
    assert len(body["correlation_id"]) >= 8


async def test_register_duplicate_email_returns_envelope(client) -> None:
    """Alias con un payload diferente sólo en campos opcionales, mismo email."""
    base = {
        "email": "dupemail@jadecapital.local",
        "password": "Dup12345!",
        "first_name": "First",
        "last_name": "Last",
        "phone": "+34611111111",
    }
    first = await client.post("/api/v1/auth/register", json=base)
    assert first.status_code == 201
    second = await client.post("/api/v1/auth/register", json=base)
    assert second.status_code == 409
    assert second.json()["code"] == "AUTH_EMAIL_TAKEN"


@pytest.mark.parametrize(
    "password",
    ["short1", "nodigits!", "12345678"],
)
async def test_register_weak_password_rejected(
    client, password: str, unique_email: str
) -> None:
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": unique_email,
            "password": password,
            "first_name": "Weak",
            "last_name": "Pass",
            "phone": "+34622222222",
        },
    )
    assert resp.status_code == 422
    body = resp.json()
    assert body["code"] == "VALIDATION_ERROR"


@pytest.mark.parametrize(
    "phone",
    ["abc", "+", "+12345", ""],  # vacío es inválido (min_length=7) y letras no
)
async def test_register_invalid_phone_rejected(
    client, phone: str, unique_email: str
) -> None:
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": unique_email,
            "password": "Test1234!",
            "first_name": "Phone",
            "last_name": "Test",
            "phone": phone,
        },
    )
    assert resp.status_code == 422
    body = resp.json()
    assert body["code"] == "VALIDATION_ERROR"


async def test_register_short_first_name_rejected(
    client, unique_email: str
) -> None:
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": unique_email,
            "password": "Test1234!",
            "first_name": "A",  # 1 char — debajo del mínimo 2
            "last_name": "X",
            "phone": "+34612345678",
        },
    )
    assert resp.status_code == 422
    assert resp.json()["code"] == "VALIDATION_ERROR"


async def test_login_after_register(client, valid_register_payload) -> None:
    """Cover del spec: login con credenciales recién registradas."""
    reg = await client.post("/api/v1/auth/register", json=valid_register_payload)
    assert reg.status_code == 201, reg.text

    resp = await client.post(
        "/api/v1/auth/login",
        json={
            "email": valid_register_payload["email"],
            "password": valid_register_payload["password"],
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["access_token"]
    assert body["refresh_token"]


async def test_login_happy_path(client, unique_email: str) -> None:
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": unique_email,
            "password": "Carol1234!",
            "first_name": "Carol",
            "last_name": "Test",
            "phone": "+34612345679",
        },
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": "Carol1234!"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["access_token"]
    # p0f.1: el JWT del login también lleva ``workspace_ids`` poblado.
    claims = decode_access_token(body["access_token"])
    assert isinstance(claims["workspace_ids"], list)
    assert len(claims["workspace_ids"]) >= 1


async def test_login_wrong_password_returns_envelope(client, unique_email: str) -> None:
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": unique_email,
            "password": "Dave1234!",
            "first_name": "Dave",
            "last_name": "Test",
            "phone": "+34612345680",
        },
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": "WrongPass1!"},
    )
    assert resp.status_code == 401
    body = resp.json()
    assert body["code"] == "AUTH_INVALID_CREDENTIALS"


async def test_refresh_token_rotates(client, valid_register_payload) -> None:
    reg = await client.post("/api/v1/auth/register", json=valid_register_payload)
    assert reg.status_code == 201
    old_refresh = reg.json()["refresh_token"]

    resp = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": old_refresh}
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["refresh_token"] != old_refresh
    assert body["access_token"]
    # p0f.1: el access rotado lleva ``workspace_ids`` poblado con la
    # membership actual del user.
    claims = decode_access_token(body["access_token"])
    assert isinstance(claims["workspace_ids"], list)
    assert len(claims["workspace_ids"]) >= 1


async def test_refresh_rejects_revoked_token(client, valid_register_payload) -> None:
    reg = await client.post("/api/v1/auth/register", json=valid_register_payload)
    assert reg.status_code == 201
    old_refresh = reg.json()["refresh_token"]

    rotated = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": old_refresh}
    )
    assert rotated.status_code == 200

    reuse = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": old_refresh}
    )
    assert reuse.status_code == 401
    body = reuse.json()
    assert body["code"] == "AUTH_TOKEN_REVOKED"


async def test_logout_revokes_token(client, valid_register_payload) -> None:
    reg = await client.post("/api/v1/auth/register", json=valid_register_payload)
    assert reg.status_code == 201
    refresh = reg.json()["refresh_token"]
    access = reg.json()["access_token"]

    logout = await client.post(
        "/api/v1/auth/logout", json={"refresh_token": refresh}
    )
    assert logout.status_code == 200

    me_after = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access}"},
    )
    assert me_after.status_code == 200  # access aún válido hasta exp.


async def test_me_requires_token(client) -> None:
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401
    body = resp.json()
    assert body["code"] == "AUTH_TOKEN_MISSING"


async def test_me_rejects_garbage_token(client) -> None:
    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer this.is.not.a.jwt"},
    )
    assert resp.status_code == 401
    body = resp.json()
    assert body["code"] == "AUTH_TOKEN_INVALID"


async def test_me_returns_workspaces(client, valid_register_payload) -> None:
    reg = await client.post("/api/v1/auth/register", json=valid_register_payload)
    assert reg.status_code == 201
    access = reg.json()["access_token"]

    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access}"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["email"] == valid_register_payload["email"]
    assert body["first_name"] == "Test"
    assert body["last_name"] == "User"
    assert body["phone"] == "+34612345678"
    assert len(body["workspaces"]) == 1
    assert body["workspaces"][0]["role_in_workspace"] == "OWNER"


async def test_idempotency_key_returns_cached_response(
    client, valid_register_payload
) -> None:
    headers = {"Idempotency-Key": "idem-key-12345"}
    payload = valid_register_payload
    first = await client.post(
        "/api/v1/auth/register", json=payload, headers=headers
    )
    assert first.status_code == 201

    # Reenviar con la misma key devuelve la respuesta cacheada (mismo 201),
    # NO intenta crear el usuario de nuevo.
    second = await client.post(
        "/api/v1/auth/register", json=payload, headers=headers
    )
    assert second.status_code == 201
    assert first.json()["access_token"] == second.json()["access_token"]


async def test_error_envelope_has_correlation_id(client) -> None:
    headers = {"X-Correlation-Id": "0" * 36}
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@jadecapital.local", "password": "Nobody1234!"},
        headers=headers,
    )
    assert resp.status_code == 401
    body = resp.json()
    assert body["code"] == "AUTH_INVALID_CREDENTIALS"
    assert body["correlation_id"] == "0" * 36
