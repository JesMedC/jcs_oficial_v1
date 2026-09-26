"""Workspace discipline API risk-control settings."""
from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import select

from app.models import Workspace, WorkspacePlanTier


async def _register(client, payload):
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _workspace_of(client, headers):
    return (
        await client.get("/api/v1/auth/me", headers=headers)
    ).json()["workspaces"][0]


async def test_get_workspace_discipline_returns_all_settings(
    client, valid_register_payload, db_session
) -> None:
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    ws = await _workspace_of(client, headers)
    row = (
        await db_session.execute(
            select(Workspace).where(Workspace.id == uuid.UUID(ws["id"]))
        )
    ).scalar_one()
    row.plan_tier = WorkspacePlanTier.PRO
    row.session_ops_cap = 5
    row.daily_loss_pct = Decimal("1.50")
    row.weekly_loss_pct = Decimal("3.00")
    row.monthly_loss_pct = Decimal("6.00")
    await db_session.commit()

    resp = await client.get(
        f"/api/v1/workspaces/{ws['id']}/discipline", headers=headers
    )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["workspace_id"] == ws["id"]
    assert body["session_ops_cap"] == 5
    assert body["daily_loss_pct"] == "1.50"
    assert body["weekly_loss_pct"] == "3.00"
    assert body["monthly_loss_pct"] == "6.00"
    assert body["ceiling"] == 6


async def test_patch_workspace_discipline_updates_loss_limits_without_cap(
    client, valid_register_payload, db_session
) -> None:
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    ws = await _workspace_of(client, headers)
    row = (
        await db_session.execute(
            select(Workspace).where(Workspace.id == uuid.UUID(ws["id"]))
        )
    ).scalar_one()
    row.plan_tier = WorkspacePlanTier.PRO
    row.session_ops_cap = 5
    await db_session.commit()

    resp = await client.patch(
        f"/api/v1/workspaces/{ws['id']}/discipline",
        headers=headers,
        json={
            "daily_loss_pct": "1.25",
            "weekly_loss_pct": "2.50",
            "monthly_loss_pct": None,
        },
    )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["session_ops_cap"] == 5
    assert body["daily_loss_pct"] == "1.25"
    assert body["weekly_loss_pct"] == "2.50"
    assert body["monthly_loss_pct"] is None

    await db_session.refresh(row)
    assert row.session_ops_cap == 5
    assert row.daily_loss_pct == Decimal("1.25")
    assert row.weekly_loss_pct == Decimal("2.50")
    assert row.monthly_loss_pct is None


async def test_patch_session_ops_cap_only_preserves_loss_limits(
    client, valid_register_payload, db_session
) -> None:
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    ws = await _workspace_of(client, headers)
    row = (
        await db_session.execute(
            select(Workspace).where(Workspace.id == uuid.UUID(ws["id"]))
        )
    ).scalar_one()
    row.plan_tier = WorkspacePlanTier.PRO
    row.daily_loss_pct = Decimal("1.25")
    await db_session.commit()

    resp = await client.patch(
        f"/api/v1/workspaces/{ws['id']}/discipline",
        headers=headers,
        json={"session_ops_cap": 4},
    )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["session_ops_cap"] == 4
    assert body["daily_loss_pct"] == "1.25"

    await db_session.refresh(row)
    assert row.session_ops_cap == 4
    assert row.daily_loss_pct == Decimal("1.25")
