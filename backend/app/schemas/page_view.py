"""PageView schemas — input del tracking endpoint + output del admin
dashboard.

p0c: tres contratos.

- ``PageViewIn`` — body del POST ``/api/v1/analytics/pageview``.
  Campos opcionales porque la SPA puede no tenerlos todos en el primer
  hit (ej. ``page_title`` se actualiza con ``document.title`` después
  del mount).
- ``PageViewOut`` — fila individual, devuelta raramente (el POST es
  204 No Content). La dejamos para compatibilidad con futuras
  endpoints de "mis últimas visitas".
- ``TopPageOut`` / ``AnalyticsSummaryOut`` — respuestas agregadas del
  dashboard admin.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PageViewIn(BaseModel):
    """Body para ``POST /api/v1/analytics/pageview``.

    Todos los campos excepto ``page_path`` son opcionales — el SPA
    puede no conocerlos en el primer hit (ej. ``session_id`` lo
    genera el cliente la primera vez).
    """

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    page_path: str = Field(min_length=1, max_length=200)
    page_title: str | None = Field(default=None, max_length=200)
    referrer: str | None = Field(default=None, max_length=500)
    session_id: str | None = Field(default=None, max_length=36)


class PageViewOut(BaseModel):
    """Snapshot de una visita."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID | None
    anonymous_id: str | None
    page_path: str
    page_title: str | None
    referrer: str | None
    created_at: datetime


class TopPageOut(BaseModel):
    """Una fila de la tabla "Páginas más visitadas" del admin."""

    page_path: str
    views_count: int
    unique_users_count: int
    unique_anonymous_count: int
    last_viewed_at: datetime


class AnalyticsSummaryOut(BaseModel):
    """Resumen del dashboard admin."""

    total_views: int
    unique_users: int
    unique_anonymous: int
    top_referrer: str | None
    days: int


__all__ = [
    "PageViewIn",
    "PageViewOut",
    "TopPageOut",
    "AnalyticsSummaryOut",
]