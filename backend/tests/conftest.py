"""Pytest fixtures — DB en memoria + cliente ASGI."""
from __future__ import annotations

import os
import uuid
from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Forzamos un JWT_SECRET >= 32 chars antes de importar la app.
os.environ.setdefault("JWT_SECRET", "test-secret-for-pytest-min-32-chars-aaaa")
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://test:test@localhost:5432/test",
)
os.environ.setdefault(
    "DATABASE_URL_SYNC",
    "postgresql+psycopg2://test:test@localhost:5432/test",
)
os.environ.setdefault(
    "CORS_ALLOW_ORIGINS",
    "http://localhost:5173,https://jadecapitalsuite.com",
)
os.environ.setdefault("LOG_FORMAT", "console")

from app.config import get_settings  # noqa: E402
from app.core.security.password import hash_password  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.models import User, UserRole  # noqa: E402


@pytest.fixture(scope="session")
def _sqlite_url() -> str:
    return "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="function")
async def db_session(_sqlite_url: str) -> AsyncIterator[AsyncSession]:
    """Sustituye el engine real por uno SQLite en memoria durante el test."""
    from app.db import session as session_module

    engine = create_async_engine(_sqlite_url, future=True)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    # Inyectamos el engine fake en el módulo de session.
    session_module._engine = engine
    session_module._session_factory = factory

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()
    session_module._engine = None
    session_module._session_factory = None


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncIterator[AsyncClient]:
    """httpx.AsyncClient contra la app ASGI."""
    from app.main import create_app

    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac  # type: ignore[misc]


@pytest.fixture
async def registered_user(db_session: AsyncSession) -> dict[str, str]:
    """Crea un usuario directamente vía SQLAlchemy para evitar round-trips."""
    user = User(
        email="fixture@jadecapital.local",
        password_hash=hash_password("Fixture1234"),
        name="Fixture User",
        role=UserRole.USER,
    )
    db_session.add(user)
    await db_session.flush()
    return {
        "email": user.email,
        "password": "Fixture1234",
        "name": user.name,
        "user_id": str(user.id),
    }


@pytest.fixture
def correlation_id() -> str:
    return str(uuid.uuid4())