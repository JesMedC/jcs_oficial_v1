"""Structlog configuration.

- ``json`` renderer en producción (parseable por cualquier colector).
- ``console`` renderer en dev (coloreado, lectura humana).
- ``correlation_id`` se inyecta desde ``contextvars`` (lo pone el
  ``CorrelationIdMiddleware``).
- Filtro de secretos para que nunca se loguee ``password``, ``token``,
  ``password_hash`` ni ``token_hash``.
"""
from __future__ import annotations

import logging
import sys
from typing import Any

import structlog
from structlog.contextvars import merge_contextvars
from structlog.stdlib import BoundLogger


def _drop_sensitive(_, __, event_dict: dict[str, Any]) -> dict[str, Any]:
    """Processor: enmascara campos sensibles."""
    sensitive = {"password", "token", "password_hash", "token_hash", "refresh_token"}
    for key in sensitive:
        if key in event_dict:
            event_dict[key] = "***REDACTED***"
    return event_dict


def configure_logging(settings) -> None:
    """Inicializa structlog + stdlib logging.

    ``settings`` es la instancia de ``app.config.settings.Settings``.
    """
    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=level,
    )

    shared_processors: list[Any] = [
        merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        _drop_sensitive,
    ]

    if settings.log_format == "json":
        renderer: Any = structlog.processors.JSONRenderer()
    else:
        renderer = structlog.dev.ConsoleRenderer(colors=True)

    structlog.configure(
        processors=shared_processors + [renderer],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str | None = None) -> BoundLogger:
    return structlog.get_logger(name)