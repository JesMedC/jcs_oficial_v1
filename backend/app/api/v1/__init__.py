"""API v1 router aggregator (sin health — health va al top level)."""
from fastapi import APIRouter

from app.api.v1 import (
    accounts,
    admin,
    analytics,
    auth,
    calendar,
    me,
    movements,
    subscriptions,
    trades,
    uploads,
    webhooks,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(me.router)
api_router.include_router(subscriptions.router)
api_router.include_router(admin.router)
api_router.include_router(webhooks.router)
api_router.include_router(analytics.router)
# Movements must be registered BEFORE accounts: the movements router
# exposes `/accounts/me/movements` (literal `me`, not a UUID). The
# accounts router uses `/{account_id}/...` paths. If accounts is
# included first, FastAPI's route resolver tries to match
# `/accounts/me/movements` against the accounts router (matching
# `me` as `{account_id}`), fails, and returns 404 without ever
# consulting the movements router.
api_router.include_router(movements.router)
api_router.include_router(accounts.router)
api_router.include_router(trades.router)
api_router.include_router(calendar.router)
api_router.include_router(uploads.router)