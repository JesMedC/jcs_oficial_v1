# Trading Scanner — Backend

FastAPI service that fetches 5-minute forex OHLCV, runs the 5-point confirmation
engine, and streams candles + alerts over WebSocket.

## Quickstart

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # optional, defaults are fine
uvicorn app.main:app --reload --port 8000
```

Then hit `http://localhost:8000/healthz`.

## Data providers

The service selects its data source from `SCANNER_PROVIDER`:

- **`dukascopy`** (default) — Dukascopy Bank public tick data, free, no token.
  Symbols use slash notation (`EUR/USD`). Quality is institutional-grade and
  data goes back to 2003. 5-minute OHLCV is aggregated server-side.
- **`oanda`** — OANDA v20 REST + streaming. Requires `OANDA_API_TOKEN` and
  `OANDA_ACCOUNT_ID`. If the token is empty the service refuses to start.

**Why Dukascopy and not Yahoo Finance:** yfinance is an unofficial scraper
that Yahoo rate-limits aggressively from cloud and shared IPs, returning
empty results. Dukascopy publishes a public CDN of bi5 tick data that is
free for personal use and reliable from any network.

## Layout

```
app/
  main.py              FastAPI app + healthz
  core/config.py       Settings (env-driven)
  data/                MarketDataProvider + implementations
  indicators/          EMA, Bollinger, Stochastic, S/R, Fibonacci
  engine/              5-point confirmation engine + alert lifecycle
  api/                 REST + WebSocket routes
tests/                 pytest suite
```
