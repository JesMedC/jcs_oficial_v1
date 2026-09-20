"""Provider factory.

Single entry point used by ``app.main`` to construct the provider based
on ``Settings.scanner_provider``. Centralising this means the rest of the
codebase never has to know about provider-specific env vars or classes.
"""

from __future__ import annotations

from app.core.config import Settings
from app.data.dukascopy_provider import DukascopyProvider
from app.data.oanda_provider import OandaProvider
from app.data.provider import MarketDataProvider


def build_provider(settings: Settings) -> MarketDataProvider:
    """Return the provider selected by ``settings.scanner_provider``.

    Args:
        settings: Application settings.

    Returns:
        Concrete :class:`MarketDataProvider` instance.

    Raises:
        ValueError: If ``scanner_provider`` is not a known name.
    """
    name = settings.scanner_provider.lower().strip()
    if name == "dukascopy":
        return DukascopyProvider()
    if name == "oanda":
        return OandaProvider(settings)
    raise ValueError(
        f"Unknown SCANNER_PROVIDER={settings.scanner_provider!r}. "
        f"Expected 'dukascopy' or 'oanda'."
    )
