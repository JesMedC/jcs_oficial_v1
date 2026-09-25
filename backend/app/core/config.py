"""Backward-compat shim — settings live in :mod:`app.config`.

``app.core.config.get_settings`` is kept so that historical imports keep
working. New code should import directly from ``app.config``.
"""
from __future__ import annotations

from app.config import Settings, get_settings

__all__ = ["Settings", "get_settings"]
