"""Alembic environment — async-aware.

Lee ``DATABASE_URL_SYNC`` del archivo ``.env`` para correr las migraciones
de forma síncrona contra Postgres, usando ``connection.run_sync(...)`` para
ejecutar las operaciones definidas con ``op``.

Configurado para:
- Cargar modelos desde ``app.models`` antes de generar migraciones
  automáticas (necesario para que ``target_metadata`` esté poblado).
- Tomar la URL de la variable de entorno ``DATABASE_URL_SYNC`` si existe;
  de lo contrario, cae al ``sqlalchemy.url`` de ``alembic.ini``.
"""
from __future__ import annotations

import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Importar modelos para registrar metadata.
from app.models import Base  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _resolve_url() -> str:
    env_url = os.getenv("DATABASE_URL_SYNC")
    if env_url:
        return env_url
    ini_url = config.get_main_option("sqlalchemy.url")
    if ini_url:
        return ini_url
    raise RuntimeError(
        "DATABASE_URL_SYNC no está definida y alembic.ini no tiene sqlalchemy.url"
    )


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (emite SQL sin conectar)."""
    context.configure(
        url=_resolve_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (conecta a la DB)."""
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = _resolve_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()