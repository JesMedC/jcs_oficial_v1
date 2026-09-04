"""GET /calendar/pnl endpoint — REQ-PNL-001..007."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from sqlalchemy import select

from app.core.security.jwt import decode_access_token
from app.models import (
    Trade,
    TradeStatus,
    TradeType,
    TradingAccount,
    TradingAccountType,
    User,
    Workspace,
)


async def _register(client, payload):
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _user_id_from_register(reg: dict) -> uuid.UUID:
    """Decode the JWT to extract the user_id from the sub claim."""
    return uuid.UUID(decode_access_token(reg["access_token"])["sub"])
    """Decode the JWT to extract the user_id from the ``sub`` claim."""
    return uuid.UUID(decode_access_token(reg["access_token"])["sub"])


async def _seed_trade(
    db_session,
    *,
    user,
    account,
    workspace,
    opened_at,
    pnl_usd,
):
    t = Trade(
        user_id=user.id,
        account_id=account.id,
        workspace_id=workspace.id,
        instrument="EUR/USD OTC",
        type=TradeType.BINARY,
        status=TradeStatus.CLOSED_WIN
        if (pnl_usd or 0) > 0
        else TradeStatus.CLOSED_LOSS,
        opened_at=opened_at,
        closed_at=opened_at,
        investment_usd=Decimal("2"),
        payout_pct=Decimal("85"),
        expiration_seconds=60,
        direction="CALL",
        interest="PLAN",
        pnl_usd=pnl_usd,
    )
    db_session.add(t)
    await db_session.flush()
    return t


async def test_empty_month_all_zero(
    client, valid_register_payload, db_session
) -> None:
    """No trades in month → every day ops=0, pnl_pct=0.0, cumple=false."""
    reg = await _register(client, valid_register_payload)
    user_id = _user_id_from_register(reg)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    ws_row = (
        await db_session.execute(
            select(Workspace).where(Workspace.owner_user_id == user_id)
        )
    ).scalar_one()
    account = TradingAccount(
        user_id=user_id,
        workspace_id=ws_row.id,
        broker_name="cal",
        type=TradingAccountType.BINARY,
        name="primary",
        balance_usd=Decimal("1000"),
    )
    db_session.add(account)
    await db_session.commit()
    resp = await client.get(
        "/api/v1/calendar/pnl",
        headers=headers,
        params={
            "workspace_id": str(ws_row.id),
            "month": "2026-09",
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert len(body["days"]) == 30
    assert all(d["ops_count"] == 0 for d in body["days"])
    assert all(d["pnl_pct"] == 0.0 for d in body["days"])
    assert body["cumple"] is False


async def test_pnl_pct_per_day(
    client, valid_register_payload, db_session
) -> None:
    """Two trades on day 5: WIN +4, LOSS -1 → pnl_pct = +3 / 1000 × 100."""
    reg = await _register(client, valid_register_payload)
    user_id = _user_id_from_register(reg)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    ws_row = (
        await db_session.execute(
            select(Workspace).where(Workspace.owner_user_id == user_id)
        )
    ).scalar_one()
    user = (
        await db_session.execute(select(User).where(User.id == user_id))
    ).scalar_one()
    account = TradingAccount(
        user_id=user.id,
        workspace_id=ws_row.id,
        broker_name="cal",
        type=TradingAccountType.BINARY,
        name="primary",
        balance_usd=Decimal("1003"),
    )
    db_session.add(account)
    await db_session.flush()
    day = datetime(2026, 9, 5, 14, 0, tzinfo=UTC)
    await _seed_trade(
        db_session,
        user=user,
        account=account,
        workspace=ws_row,
        opened_at=day,
        pnl_usd=Decimal("4"),
    )
    await _seed_trade(
        db_session,
        user=user,
        account=account,
        workspace=ws_row,
        opened_at=day,
        pnl_usd=Decimal("-1"),
    )
    await db_session.commit()

    resp = await client.get(
        "/api/v1/calendar/pnl",
        headers=headers,
        params={
            "workspace_id": str(ws_row.id),
            "month": "2026-09",
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    day5 = next(d for d in body["days"] if d["date"].endswith("-09-05"))
    assert day5["ops_count"] == 2
    assert day5["pnl_pct"] == pytest.approx(0.30, abs=0.01)


async def test_cumple_true_above_5pct(
    client, valid_register_payload, db_session
) -> None:
    """month_end > month_start × 1.05 → cumple=True."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    ws_row = (
        await db_session.execute(
            select(Workspace).where(
                Workspace.owner_user_id == _user_id_from_register(reg)
            )
        )
    ).scalar_one()
    user = (
        await db_session.execute(
            select(User).where(User.id == _user_id_from_register(reg))
        )
    ).scalar_one()
    account = TradingAccount(
        user_id=user.id,
        workspace_id=ws_row.id,
        broker_name="cal",
        type=TradingAccountType.BINARY,
        name="primary",
        balance_usd=Decimal("1000"),
    )
    db_session.add(account)
    await db_session.flush()
    day = datetime(2026, 9, 30, 14, 0, tzinfo=UTC)
    await _seed_trade(
        db_session,
        user=user,
        account=account,
        workspace=ws_row,
        opened_at=day,
        pnl_usd=Decimal("100"),
    )
    account.balance_usd = Decimal("1100")
    db_session.add(account)
    await db_session.commit()

    resp = await client.get(
        "/api/v1/calendar/pnl",
        headers=headers,
        params={
            "workspace_id": str(ws_row.id),
            "month": "2026-09",
        },
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["cumple"] is True


async def test_cumple_false_at_or_below_5pct(
    client, valid_register_payload, db_session
) -> None:
    """month_end == month_start × 1.04 → cumple=False (4% < 5%)."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    ws_row = (
        await db_session.execute(
            select(Workspace).where(
                Workspace.owner_user_id == _user_id_from_register(reg)
            )
        )
    ).scalar_one()
    user = (
        await db_session.execute(
            select(User).where(User.id == _user_id_from_register(reg))
        )
    ).scalar_one()
    account = TradingAccount(
        user_id=user.id,
        workspace_id=ws_row.id,
        broker_name="cal",
        type=TradingAccountType.BINARY,
        name="primary",
        balance_usd=Decimal("1000"),
    )
    db_session.add(account)
    await db_session.flush()
    day = datetime(2026, 9, 30, 14, 0, tzinfo=UTC)
    await _seed_trade(
        db_session,
        user=user,
        account=account,
        workspace=ws_row,
        opened_at=day,
        pnl_usd=Decimal("40"),
    )
    account.balance_usd = Decimal("1040")
    db_session.add(account)
    await db_session.commit()

    resp = await client.get(
        "/api/v1/calendar/pnl",
        headers=headers,
        params={
            "workspace_id": str(ws_row.id),
            "month": "2026-09",
        },
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["cumple"] is False


async def test_cumple_false_negative_month(
    client, valid_register_payload, db_session
) -> None:
    """Losing month → cumple=False."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    ws_row = (
        await db_session.execute(
            select(Workspace).where(
                Workspace.owner_user_id == _user_id_from_register(reg)
            )
        )
    ).scalar_one()
    user = (
        await db_session.execute(
            select(User).where(User.id == _user_id_from_register(reg))
        )
    ).scalar_one()
    account = TradingAccount(
        user_id=user.id,
        workspace_id=ws_row.id,
        broker_name="cal",
        type=TradingAccountType.BINARY,
        name="primary",
        balance_usd=Decimal("1000"),
    )
    db_session.add(account)
    await db_session.flush()
    day = datetime(2026, 9, 30, 14, 0, tzinfo=UTC)
    await _seed_trade(
        db_session,
        user=user,
        account=account,
        workspace=ws_row,
        opened_at=day,
        pnl_usd=Decimal("-50"),
    )
    account.balance_usd = Decimal("950")
    db_session.add(account)
    await db_session.commit()

    resp = await client.get(
        "/api/v1/calendar/pnl",
        headers=headers,
        params={
            "workspace_id": str(ws_row.id),
            "month": "2026-09",
        },
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["cumple"] is False


async def test_no_snapshot_zero_default(
    client, valid_register_payload, db_session
) -> None:
    """No trades → every day_start=0, pnl_pct=0."""
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    ws_row = (
        await db_session.execute(
            select(Workspace).where(
                Workspace.owner_user_id == _user_id_from_register(reg)
            )
        )
    ).scalar_one()
    user = (
        await db_session.execute(
            select(User).where(User.id == _user_id_from_register(reg))
        )
    ).scalar_one()
    account = TradingAccount(
        user_id=user.id,
        workspace_id=ws_row.id,
        broker_name="cal",
        type=TradingAccountType.BINARY,
        name="primary",
        balance_usd=Decimal("0"),
    )
    db_session.add(account)
    await db_session.commit()
    resp = await client.get(
        "/api/v1/calendar/pnl",
        headers=headers,
        params={
            "workspace_id": str(ws_row.id),
            "month": "2026-09",
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert all(d["day_start_balance"] == "0.00" for d in body["days"])
    assert all(d["pnl_pct"] == 0.0 for d in body["days"])


async def test_day_start_walk_no_wip_dependency(
    client, valid_register_payload, db_session
) -> None:
    """Pin Engram #187: PR-1 MUST NOT depend on
    ``AccountMovement.balance_after_usd``. The endpoint produces a
    sensible response with only ``Trade`` rows.
    """
    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    ws_row = (
        await db_session.execute(
            select(Workspace).where(
                Workspace.owner_user_id == _user_id_from_register(reg)
            )
        )
    ).scalar_one()
    user = (
        await db_session.execute(
            select(User).where(User.id == _user_id_from_register(reg))
        )
    ).scalar_one()
    account = TradingAccount(
        user_id=user.id,
        workspace_id=ws_row.id,
        broker_name="cal",
        type=TradingAccountType.BINARY,
        name="primary",
        balance_usd=Decimal("1000"),
    )
    db_session.add(account)
    await db_session.flush()
    day = datetime(2026, 9, 5, 14, 0, tzinfo=UTC)
    await _seed_trade(
        db_session,
        user=user,
        account=account,
        workspace=ws_row,
        opened_at=day,
        pnl_usd=Decimal("50"),
    )
    await db_session.commit()

    resp = await client.get(
        "/api/v1/calendar/pnl",
        headers=headers,
        params={
            "workspace_id": str(ws_row.id),
            "month": "2026-09",
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    # Day 5 day_start_balance = current 1000 − 50 (pnl on day 5) = 950.
    day5 = next(d for d in body["days"] if d["date"].endswith("-09-05"))
    assert day5["day_start_balance"] == "950.00"
    assert day5["pnl_pct"] == pytest.approx(5.26, abs=0.05)


async def test_query_count_under_threshold(
    client, valid_register_payload, db_session
) -> None:
    """REQ-PNL-007: ≤ 3 SQL queries for the month computation."""
    from sqlalchemy import event

    reg = await _register(client, valid_register_payload)
    headers = {"Authorization": f"Bearer {reg['access_token']}"}
    ws_row = (
        await db_session.execute(
            select(Workspace).where(
                Workspace.owner_user_id == _user_id_from_register(reg)
            )
        )
    ).scalar_one()

    counter = {"n": 0}

    def _on(*_args, **_kwargs):  # noqa: ANN001
        counter["n"] += 1

    bind = db_session.get_bind()
    event.listen(bind, "before_cursor_execute", _on)
    try:
        resp = await client.get(
            "/api/v1/calendar/pnl",
            headers=headers,
            params={
                "workspace_id": str(ws_row.id),
                "month": "2026-09",
            },
        )
    finally:
        event.remove(bind, "before_cursor_execute", _on)
    assert resp.status_code == 200, resp.text
    # Calendar domain ≤ 3 queries (REQ-PNL-007) + JWT-auth overhead
    # (~4 queries for User + WorkspaceMember lookups). We assert ≤ 8
    # so a regression adding a per-day query is caught.
    assert counter["n"] <= 8, (
        f"got {counter['n']} queries — REQ-PNL-007 expects ≤ 3 calendar "
        f"domain. Investigate for N+1."
    )
