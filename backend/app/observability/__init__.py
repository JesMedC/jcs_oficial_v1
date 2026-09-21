"""Observability setup — structlog config + contextvars."""
from app.observability.logging import configure_logging

__all__ = ["configure_logging"]