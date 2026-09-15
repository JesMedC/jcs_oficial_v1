"""PATCH /api/v1/workspaces/{id}/discipline — REQ-DSC-004 + REQ-DSC-005.

Slice A backend foundation. The endpoint lets a workspace member
tighten (never loosen) ``session_ops_cap`` within the plan-tier
ceiling. The engine reads this value at trade-open time
(REQ-DISC-008).

RED until T-008 lands — every test below currently 404s.
"""
from __future__ import annotations

import uuid

from sqlalchemy import select

from app.core.security.jwt import decode_access_token
from app.models import (
    Workspace,
    WorkspaceMember,
    WorkspaceMemberRole,
    WorkspacePlanTier,
)


async def _register(client, payload):
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _user_id_from_register(reg: dict) -> uuid.UUID:
    return uuid.UUID(decode_access_token(reg["access_token"])["sub"])


async def _workspace_of(client, headers, reg):
    """Return the auto-created workspace of the registered user."""
    return (
        await client.get("/api/v1/auth/me", headers=headers)
    ).json()["workspaces"][0]


# ---- happy path ----
async def test_patch_session_ops_cap_persists(
    client, valid_register_payload, db_session
) -> None:
    """PATCH a PRO workspace with cap=5 → 200 + cap=5; re-GET confirms."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    ws = await _workspace_of(client, headers, reg)
    # Promote the workspace to PRO (ceiling=6) so the test exercises the
    # ceiling validation path.
    ws_row = (
        await db_session.execute(
            select(Workspace).where(Workspace.id == uuid.UUID(ws["id"]))
        )
    ).scalar_one()
    ws_row.plan_tier = WorkspacePlanTier.PRO
    await db_session.commit()

    resp = await client.patch(
        f"/api/v1/workspaces/{ws['id']}/discipline",
        headers=headers,
        json={"session_ops_cap": 5},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["session_ops_cap"] == 5
    assert body["ceiling"] == 6
    assert body["plan_tier"] == "PRO"
    assert body["workspace_id"] == ws["id"]

    # Re-GET to confirm persistence.
    me = await client.get("/api/v1/auth/me", headers=headers)
    refreshed = next(
        w for w in me.json()["workspaces"] if w["id"] == ws["id"]
    )
    # ``WorkspaceOut`` now surfaces ``session_ops_cap`` (T-006).
    assert refreshed["session_ops_cap"] == 5


# ---- out-of-range ----
async def test_patch_session_ops_cap_above_ceiling_returns_422(
    client, valid_register_payload, db_session
) -> None:
    """PATCH cap=7 on PRO (ceiling=6) → 422 DISCIPLINE_CAP_OUT_OF_RANGE.

    The error message MUST mention the ceiling so the frontend can
    show a localized "tope 6" pill.
    """
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    ws = await _workspace_of(client, headers, reg)
    ws_row = (
        await db_session.execute(
            select(Workspace).where(Workspace.id == uuid.UUID(ws["id"]))
        )
    ).scalar_one()
    ws_row.plan_tier = WorkspacePlanTier.PRO
    await db_session.commit()

    resp = await client.patch(
        f"/api/v1/workspaces/{ws['id']}/discipline",
        headers=headers,
        json={"session_ops_cap": 7},
    )
    assert resp.status_code == 422, resp.text
    body = resp.json()
    assert body["code"] == "DISCIPLINE_CAP_OUT_OF_RANGE"
    # The message must mention the ceiling (6) so the client can
    # render "tope 6" without a second round-trip.
    assert "6" in body["message"], body["message"]


# ---- reset to ceiling ----
async def test_patch_session_ops_cap_null_resets_to_ceiling(
    client, valid_register_payload, db_session
) -> None:
    """PATCH cap=null → column cleared; engine falls back to ceiling.

    Pin REQ-DSC-003: NULL behaves identically to the column being
    set to the ceiling.
    """
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    ws = await _workspace_of(client, headers, reg)
    ws_row = (
        await db_session.execute(
            select(Workspace).where(Workspace.id == uuid.UUID(ws["id"]))
        )
    ).scalar_one()
    ws_row.plan_tier = WorkspacePlanTier.PRO
    ws_row.session_ops_cap = 4
    await db_session.commit()

    resp = await client.patch(
        f"/api/v1/workspaces/{ws['id']}/discipline",
        headers=headers,
        json={"session_ops_cap": None},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["session_ops_cap"] is None
    assert body["ceiling"] == 6

    await db_session.refresh(ws_row)
    assert ws_row.session_ops_cap is None


# ---- auth ----
async def test_patch_session_ops_cap_unauthenticated(
    client, valid_register_payload
) -> None:
    """Missing token → 401 AUTH_TOKEN_MISSING.

    We register a user to know the workspace UUID exists in the DB;
    the PATCH itself is issued without a Bearer header.
    """
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    ws = await _workspace_of(client, headers, reg)
    resp = await client.patch(
        f"/api/v1/workspaces/{ws['id']}/discipline",
        json={"session_ops_cap": 4},
    )
    assert resp.status_code == 401, resp.text


async def test_patch_session_ops_cap_non_member_returns_403(
    client, valid_register_payload, db_session
) -> None:
    """A registered user that is NOT a member of the target workspace
    gets 403 WORKSPACE_ACCESS_DENIED.

    We register two users; user B attempts to PATCH user A's
    workspace.
    """
    # Register A.
    reg_a = await _register(client, valid_register_payload)
    headers_a = {"Authorization": f"Bearer {reg_a['access_token']}"}
    ws_a = await _workspace_of(client, headers_a, reg_a)
    # Register B (different email).
    import copy

    payload_b = copy.deepcopy(valid_register_payload)
    payload_b["email"] = (
        f"b-{uuid.uuid4().hex[:8]}@jadecapital.local"
    )
    reg_b = await _register(client, payload_b)
    headers_b = {"Authorization": f"Bearer {reg_b['access_token']}"}

    # B attempts to PATCH A's workspace → 403.
    resp = await client.patch(
        f"/api/v1/workspaces/{ws_a['id']}/discipline",
        headers=headers_b,
        json={"session_ops_cap": 4},
    )
    assert resp.status_code == 403, resp.text
    body = resp.json()
    assert body["code"] == "WORKSPACE_ACCESS_DENIED"

    # Sanity: confirm B's own workspace has no WorkspaceMember for A
    # (so the 403 is genuine, not a coincidental match).
    target = uuid.UUID(ws_a["id"])
    member = (
        await db_session.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == target,
                WorkspaceMember.user_id == uuid.UUID(
                    decode_access_token(reg_b["access_token"])["sub"]
                ),
            )
        )
    ).scalar_one_or_none()
    assert member is None