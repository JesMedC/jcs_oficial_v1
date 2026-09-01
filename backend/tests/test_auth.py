"""Smoke tests para los endpoints de auth."""
from __future__ import annotations

import pytest


async def test_register_happy_path(client) -> None:
    payload = {
        "email": "alice@jadecapital.local",
        "password": "Alice1234!",
        "name": "Alice",
    }
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["expires_in"] > 0
    # Cookie httpOnly seteada.
    assert "jcs_refresh_token" in resp.cookies


async def test_register_duplicate_email_returns_envelope(client) -> None:
    payload = {
        "email": "bob@jadecapital.local",
        "password": "Bob12345!",
        "name": "Bob",
    }
    first = await client.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 201, first.text

    second = await client.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 409
    body = second.json()
    assert body["code"] == "AUTH_EMAIL_TAKEN"
    assert body["message"]
    assert len(body["correlation_id"]) >= 8


@pytest.mark.parametrize(
    "password",
    ["short1", "nodigits!", "12345678"],
)
async def test_register_weak_password_rejected(client, password: str) -> None:
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "weakpass@jadecapital.local",
            "password": password,
            "name": "Weak Pass",
        },
    )
    assert resp.status_code == 422
    body = resp.json()
    assert body["code"] == "VALIDATION_ERROR"


async def test_login_happy_path(client) -> None:
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "carol@jadecapital.local",
            "password": "Carol1234!",
            "name": "Carol",
        },
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "carol@jadecapital.local", "password": "Carol1234!"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["access_token"]


async def test_login_wrong_password_returns_envelope(client) -> None:
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "dave@jadecapital.local",
            "password": "Dave1234!",
            "name": "Dave",
        },
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "dave@jadecapital.local", "password": "WrongPass1!"},
    )
    assert resp.status_code == 401
    body = resp.json()
    assert body["code"] == "AUTH_INVALID_CREDENTIALS"


async def test_refresh_token_rotates(client) -> None:
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "eve@jadecapital.local",
            "password": "Eve12345!",
            "name": "Eve",
        },
    )
    assert reg.status_code == 201
    old_refresh = reg.json()["refresh_token"]

    resp = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": old_refresh}
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["refresh_token"] != old_refresh
    assert body["access_token"]


async def test_refresh_rejects_revoked_token(client) -> None:
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "frank@jadecapital.local",
            "password": "Frank1234!",
            "name": "Frank",
        },
    )
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


async def test_logout_revokes_token(client) -> None:
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "grace@jadecapital.local",
            "password": "Grace1234!",
            "name": "Grace",
        },
    )
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


async def test_me_returns_workspaces(client) -> None:
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "heidi@jadecapital.local",
            "password": "Heidi1234!",
            "name": "Heidi",
        },
    )
    assert reg.status_code == 201
    access = reg.json()["access_token"]

    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access}"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["email"] == "heidi@jadecapital.local"
    assert len(resp.json()["workspaces"]) == 1
    assert resp.json()["workspaces"][0]["role_in_workspace"] == "OWNER"


async def test_idempotency_key_returns_cached_response(client) -> None:
    headers = {"Idempotency-Key": "idem-key-12345"}
    payload = {
        "email": "ivan@jadecapital.local",
        "password": "Ivan12345!",
        "name": "Ivan",
    }
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