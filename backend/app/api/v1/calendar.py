"""``GET /api/v1/calendar/pnl`` — month P&L grid + cumplimiento (PR-1).

Materializes spec REQ-PNL-001..007 of ``pnl-calendar``. The endpoint
consumes ``calendar_service.compute_month_pnl`` which returns the
month-grid response.

PROVISIONAL day-start balance: the calendar service uses the Python
walk over the ``Trade`` ledger (per Engram #187 + design.md
ADR-001) until the ``account-movement-ledger`` WIP merges.
"""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession
from app.schemas.trade import CalendarPnlOut, DayEntryOut
from app.services.calendar_service import compute_month_pnl

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("/pnl", response_model=CalendarPnlOut)
async def get_calendar_pnl_endpoint(
    user: CurrentUser,
    db: DbSession,
    workspace_id: Annotated[uuid.UUID, Query()],
    month: Annotated[str, Query(pattern=r"^\d{4}-\d{2}$")],
    account_id: Annotated[uuid.UUID | None, Query()] = None,
) -> CalendarPnlOut:
    """Month-grid P&L + monthly ``cumple`` boolean.

    ``GET /api/v1/calendar/pnl?workspace_id=&month=YYYY-MM[&account_id=]``

    Each ``DayEntryOut`` carries ``ops_count``, ``day_start_balance``,
    and ``pnl_pct``. The top-level ``cumple`` boolean is the monthly
    indicator (>5 % gain) — NEVER a per-day badge (REQ-PNL-006).
    """
    result = await compute_month_pnl(
        db,
        user=user,
        workspace_id=workspace_id,
        month=month,
        account_id=account_id,
    )
    return CalendarPnlOut(
        workspace_id=result.workspace_id,
        month=result.month,
        month_start_balance=result.month_start_balance,
        month_end_balance=result.month_end_balance,
        cumple=result.cumple,
        days=[
            DayEntryOut(
                date=day.date,
                ops_count=day.ops_count,
                day_start_balance=day.day_start_balance,
                pnl_pct=day.pnl_pct,
            )
            for day in result.days
        ],
    )


__all__ = ["router", "get_calendar_pnl_endpoint"]
