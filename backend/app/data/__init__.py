"""Market data providers.

Exposes ``MarketDataProvider`` (abstract base), a ``Candle`` dataclass, and
two implementations:

- :class:`DukascopyProvider` — default, public CDN, no token required.
- :class:`OandaProvider`     — OANDA v20 REST; stub until ``OANDA_API_TOKEN``
  is supplied (raises ``NotImplementedError`` otherwise).

Use :func:`app.data.factory.build_provider` to construct the right provider
based on :class:`app.core.config.Settings`.
"""
