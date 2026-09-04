"""PATCH /api/v1/auth/me accepts timezone (REQ-DISC-002)."""
from __future__ import annotations

import uuid

from sqlalchemy import select

from app.core.security.jwt import decode_access_token
from app.models import User


async def _register(client, payload):
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _user_id_from_register(reg: dict) -> uuid.UUID:
    """Decode the JWT to extract the user_id from the sub claim."""
    return uuid.UUID(decode_access_token(reg["access_token"])["sub"])


async def test_patch_timezone_propagates(
    client, valid_register_payload, db_session
) -> None:
    """Valid IANA tz accepted → user.timezone updated in DB."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    resp = await client.patch(
        "/api/v1/auth/me",
        headers=headers,
        json={"timezone": "America/Buenos_Aires"},
    )
    assert resp.status_code == 200, resp.text

    # Read back via DB.
    user = (
        await db_session.execute(
            select(User).where(User.id == _user_id_from_register(reg))
        )
    ).scalar_one()
    assert user.timezone == "America/Buenos_Aires"


async def test_patch_timezone_invalid(client, valid_register_payload) -> None:
    """Unknown IANA tz → 422 INVALID_TIMEZONE."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    resp = await client.patch(
        "/api/v1/auth/me",
        headers=headers,
        json={"timezone": "Mars/Olympus_Mons"},
    )
    assert resp.status_code == 422, resp.text
    body = resp.json()
    assert body["code"] == "INVALID_TIMEZONE"


async def test_patch_timezone_empty(
    client, valid_register_payload, db_session
) -> None:
    """Empty tz → kept as default (the column has a server_default)."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    resp = await client.patch(
        "/api/v1/auth/me",
        headers=headers,
        json={},
    )
    assert resp.status_code == 200, resp.text


async def test_patch_timezone_unauthenticated(client) -> None:
    """No Bearer → 401 AUTH_TOKEN_MISSING."""
    resp = await client.patch(
        "/api/v1/auth/me",
        json={"timezone": "America/Buenos_Aires"},
    )
    assert resp.status_code == 401, resp.text
