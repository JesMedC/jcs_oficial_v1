"""Analytics service — queries + mutations del modelo ``PageView``.

p0c: el flujo es

1. El SPA llama a ``POST /api/v1/analytics/pageview`` en cada cambio de
   ruta (lo monta ``usePageviewTracker``).
2. El endpoint llama a ``record_pageview`` para insertar la fila.
3. El dashboard admin (``GET /admin/analytics/top-pages`` +
   ``/admin/analytics/summary``) consulta agregaciones baratas
   (``get_top_pages``, ``get_analytics_summary``) que usan los índices
   compuestos de la tabla.

Las agregaciones usan SQL crudo para ``func.count`` / ``func.distinct``
— SQLAlchemy core las expresa limpiamente sin caer en ``subquery``.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import PageView
from app.observability.logging import get_logger
from app.schemas.page_view import AnalyticsSummaryOut, TopPageOut

log = get_logger(__name__)


# ---------- mutations ----------
async def record_pageview(
    db: AsyncSession,
    *,
    user_id: uuid.UUID | None,
    anonymous_id: str | None,
    page_path: str,
    page_title: str | None,
    referrer: str | None,
    user_agent: str | None,
    session_id: str | None,
    created_at: datetime | None = None,
) -> PageView:
    """Inserta una fila ``page_views``. Append-only.

    ``created_at`` por default es ``now()`` — se acepta como param para
    tests deterministas.
    """
    row = PageView(
        user_id=user_id,
        anonymous_id=anonymous_id,
        page_path=page_path,
        page_title=page_title,
        referrer=referrer,
        user_agent=user_agent,
        session_id=session_id,
        created_at=created_at or datetime.now(timezone.utc),
    )
    db.add(row)
    await db.flush()
    return row


# ---------- queries ----------
async def get_top_pages(
    db: AsyncSession,
    *,
    days: int = 30,
    limit: int = 20,
) -> list[TopPageOut]:
    """Páginas más visitadas en los últimos ``days`` días.

    Usa el índice ``ix_page_views_path_created``.
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # ``COUNT(DISTINCT user_id)`` ignora NULLs automáticamente; lo mismo
    # para ``anonymous_id``. Por eso ``unique_users_count`` puede ser 0
    # para una página visitada solo por anónimos.
    stmt = (
        select(
            PageView.page_path,
            func.count(PageView.id).label("views_count"),
            func.count(func.distinct(PageView.user_id)).label("unique_users_count"),
            func.count(func.distinct(PageView.anonymous_id)).label(
                "unique_anonymous_count"
            ),
            func.max(PageView.created_at).label("last_viewed_at"),
        )
        .where(PageView.created_at >= since)
        .group_by(PageView.page_path)
        .order_by(func.count(PageView.id).desc())
        .limit(limit)
    )

    rows = (await db.execute(stmt)).all()
    return [
        TopPageOut(
            page_path=row.page_path,
            views_count=int(row.views_count),
            unique_users_count=int(row.unique_users_count),
            unique_anonymous_count=int(row.unique_anonymous_count),
            last_viewed_at=row.last_viewed_at,
        )
        for row in rows
    ]


async def get_analytics_summary(
    db: AsyncSession,
    *,
    days: int = 30,
) -> AnalyticsSummaryOut:
    """Resumen para el dashboard admin.

    - ``total_views``: cuenta total.
    - ``unique_users``: distintos ``user_id`` no nulos.
    - ``unique_anonymous``: distintos ``anonymous_id`` no nulos.
    - ``top_referrer``: el referrer más frecuente en el periodo (o
      ``None`` si no hay hits).
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)

    total_stmt = (
        select(func.count(PageView.id))
        .where(PageView.created_at >= since)
    )
    unique_users_stmt = (
        select(func.count(func.distinct(PageView.user_id)))
        .where(PageView.created_at >= since, PageView.user_id.is_not(None))
    )
    unique_anon_stmt = (
        select(func.count(func.distinct(PageView.anonymous_id)))
        .where(PageView.created_at >= since, PageView.anonymous_id.is_not(None))
    )
    top_referrer_stmt = (
        select(PageView.referrer, func.count(PageView.id).label("c"))
        .where(PageView.created_at >= since, PageView.referrer.is_not(None))
        .group_by(PageView.referrer)
        .order_by(func.count(PageView.id).desc())
        .limit(1)
    )

    total = int(await db.scalar(total_stmt) or 0)
    unique_users = int(await db.scalar(unique_users_stmt) or 0)
    unique_anonymous = int(await db.scalar(unique_anon_stmt) or 0)
    top_referrer_row = (await db.execute(top_referrer_stmt)).first()

    return AnalyticsSummaryOut(
        total_views=total,
        unique_users=unique_users,
        unique_anonymous=unique_anonymous,
        top_referrer=top_referrer_row.referrer if top_referrer_row is not None else None,
        days=days,
    )


# Quita la advertencia de import unused cuando se evalúa la firma.
_ = case


__all__ = [
    "record_pageview",
    "get_top_pages",
    "get_analytics_summary",
]