"""Async engine + session factory + dependency ``get_async_session``.

``make_engine`` se llama una sola vez en el ``lifespan`` de FastAPI para
crear el engine con el pool por defecto. ``get_async_session`` es una
dependencia que produce una sesión por request y la cierra al final.
"""
from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import get_settings

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def make_engine(database_url: str | None = None) -> AsyncEngine:
    """Crea (o reemplaza) el engine global."""
    global _engine, _session_factory
    settings = get_settings()
    url = database_url or str(settings.database_url)
    _engine = create_async_engine(
        url,
        echo=False,
        pool_pre_ping=True,
        future=True,
    )
    _session_factory = async_sessionmaker(_engine, expire_on_commit=False)
    return _engine


def make_session_factory() -> async_sessionmaker[AsyncSession]:
    """Devuelve la sessionmaker; crea engine si hace falta."""
    if _session_factory is None:
        make_engine()
    assert _session_factory is not None
    return _session_factory


async def dispose_engine() -> None:
    """Cierra el engine — se llama en el shutdown del lifespan."""
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
    _engine = None
    _session_factory = None


async def get_async_session() -> AsyncIterator[AsyncSession]:
    """Dependencia FastAPI: una sesión por request."""
    factory = make_session_factory()
    async with factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def get_engine() -> AsyncEngine | None:
    """Acceso de solo lectura al engine (tests / healthchecks)."""
    return _engine