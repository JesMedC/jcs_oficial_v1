# Trading Scanner — 5-Min Binary Options Signal Engine

## Objective

Build a real-time trading signal scanner that watches 5-minute forex candles, validates entries against a strict 5-point confirmation engine (4-of-5 minimum), and streams both the chart and an alerts panel to a split-screen UI.

## Problem

The user needs a disciplined, rule-based scanner that enforces a documented strategy:

- Timeframe locked at 5 minutes
- Binary direction: CALL or PUT, fixed 5-minute expiry
- Position sizing hard-pinned to 1% of account capital
- At least 4 of 5 confirmations required before any alert fires
- All entries in the direction of the trend

The discipline comes from the engine, not from the trader staring at a chart.

## Why this design

The 5 confirmations encode the strategy:

1. **Trend & structure** — last impulses at 5m define direction
2. **Support / resistance** — interaction with levels touched 2+ times
3. **Stochastic 5-5-3** — overbought >85 or oversold <15
4. **EMA hierarchy** — EMA 200 dominates, then 100, then 50
5. **Fibonacci** — entry at 50%, 61.8%, or 78.6% with confluence preferred

The UI is split because two screens of info at once beat eye-jumping between chart and signals.

## Scope (this feature)

### In scope

- Backend service that fetches 5-minute forex OHLCV, computes indicators, runs the confirmation engine, and pushes updates over WebSocket
- Frontend split-screen: candlestick chart with EMA + Bollinger overlays on the left, live alerts table on the right
- Default data provider: `yfinance` (Yahoo Finance unofficial endpoint, free, no token)
- Pluggable `MarketDataProvider` interface so `OANDA_API_TOKEN` swap is a one-env-var change later
- One forex pair at a time (start with `EURUSD=X`)
- Paper-mode: alerts record their outcome (WIN/LOSS) automatically after 5 minutes based on the close of the expiry candle

### Out of scope (explicit)

- Real broker order execution (no auto-trade)
- Multi-symbol grid scanning (single chart + alerts panel for now)
- Persistence to a database (alerts live in memory + emitted over WS)
- User auth / accounts (single-user local tool)

## Constraints

- **Free + open source** everything, no paid tiers
- **Default runs without any API token**
- **No broker API scraping** — only public endpoints
- **Provider pivot (2026-09-19):** Started with yfinance but Yahoo rate-limits this IP. Switched to **Dukascopy public bi5 endpoint** as default. Data is institutional-grade, free, no token, no rate-limiting.
- Backend latency budget: candle update → alert decision < 500 ms
- Frontend must remain responsive: chart redraw on each new tick must not block the alerts panel

## Task checklist

| ID  | Task | Status |
| --- | ---- | ------ |
| T01 | Bootstrap Python venv + FastAPI scaffold + dependencies            | pending |
| T02 | `MarketDataProvider` interface + `DukascopyProvider` implementation | pending |
| T03 | `OandaProvider` stub activated by `OANDA_API_TOKEN` env var         | pending |
| T04 | Indicator engine: EMA 50/100/200, Bollinger (20, 2σ), Stochastic 5-5-3 | pending |
| T05 | Support / Resistance detector (≥2 touches, pivot clustering)       | pending |
| T06 | Fibonacci detector: swings + retracements at 50/61.8/78.6 + confluence count | pending |
| T07 | Confirmation engine: score each of 5 points, require ≥4, decide CALL/PUT | pending |
| T08 | Alert lifecycle: PENDING → WIN/LOSS after 5-min expiry              | pending |
| T09 | WebSocket broadcaster: candles + alert events                      | pending |
| T10 | Frontend scaffold: Vite + React + TS + lightweight-charts           | pending |
| T11 | Split-screen layout: chart left, alerts panel right                | pending |
| T12 | Chart: candlesticks + EMA(50,100,200) line series + Bollinger bands | pending |
| T13 | Alerts table: time, asset, side, confidence, status columns + live updates | pending |
| T14 | End-to-end smoke test: boot stack, watch EURUSD=X, see alert flow into panel | pending |

## Acceptance criteria

- [ ] App boots with zero env vars and connects to live EUR/USD data within 10 seconds
- [ ] Setting `OANDA_API_TOKEN` switches the provider with no code changes
- [ ] Chart shows candlesticks + 3 EMA lines + Bollinger upper/middle/lower
- [ ] Alerts table receives at least one PENDING alert within 5 minutes of clean data
- [ ] Each PENDING alert transitions to WIN or LOSS after exactly 5 minutes
- [ ] No alert fires with fewer than 4 confirmed points (verified by inspection of logs)
- [ ] All entries are in trend direction (verified by inspection of logs)

## Verification plan

- `python -m pytest` for indicator math + confirmation engine unit tests
- `curl` smoke against `GET /healthz`, `GET /api/candles`
- Manual: run backend + frontend, point at `EURUSD=X`, watch the panel populate

## Progress log

### 2026-09-19 — bootstrap

- Created `trading-scanner/{backend,frontend,odd}` directory structure
- Picked stack: Python 3.12 + FastAPI + pandas-ta + yfinance / React + TS + Vite + lightweight-charts
- Picked default data source: `yfinance` (free, no token); OANDA pluggable later
- Started this doc
