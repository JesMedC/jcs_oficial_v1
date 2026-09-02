"""API v1 router aggregator (sin health — health va al top level)."""
from fastapi import APIRouter

from app.api.v1 import (
    accounts,
    admin,
    analytics,
    auth,
    me,
    subscriptions,
    trades,
    webhooks,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(me.router)
api_router.include_router(subscriptions.router)
api_router.include_router(admin.router)
api_router.include_router(webhooks.router)
api_router.include_router(analytics.router)
api_router.include_router(accounts.router)
api_router.include_router(trades.router)