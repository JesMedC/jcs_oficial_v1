"""API v1 router aggregator.

Excludes ``health`` — that lives at the top level for probe routing.
"""
from fastapi import APIRouter

from app.api.v1 import (
    accounts,
    admin,
    analytics,
    auth,
    calendar,
    google_oauth,
    me,
    subscriptions,
    trades,
    uploads,
    webhooks,
    workspace_discipline,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(google_oauth.router)
api_router.include_router(me.router)
api_router.include_router(subscriptions.router)
api_router.include_router(admin.router)
api_router.include_router(webhooks.router)
api_router.include_router(analytics.router)
api_router.include_router(accounts.router)
api_router.include_router(trades.router)
api_router.include_router(calendar.router)
api_router.include_router(uploads.router)
# Slice A: per-workspace discipline cap (REQ-DSC-004). Resource-scoped
# under ``/workspaces`` — see workspace_discipline.py.
api_router.include_router(workspace_discipline.router)
