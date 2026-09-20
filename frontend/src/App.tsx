// App — top-level composition.
//
// Renders:
//
// - ``Header``       — symbol, last close, connection dot
// - ``SplitScreen``  — 70/30 flex layout
//   - left  → ``Chart``            (lightweight-charts canvas)
//   - right → ``AlertsPanel``      (live alerts table)
//
// All data flows down from three hooks:
//
// - ``useBackendHealth``  — polls /healthz for the provider/symbol.
// - ``useCandles``         — WS subscription for OHLCV + indicators.
// - ``useAlerts``          — WS subscription for the alerts feed.

import { useMemo } from "react";

import { AlertsPanel } from "./components/AlertsPanel";
import { Chart } from "./components/Chart";
import { Header } from "./components/Header";
import { SplitScreen } from "./components/SplitScreen";

import "./App.css";
import { useAlerts } from "./hooks/useAlerts";
import { useBackendHealth } from "./hooks/useBackendHealth";
import { useCandles } from "./hooks/useCandles";
import { computeChangePct } from "./utils/format";

export default function App() {
  const health = useBackendHealth();
  const { candles, indicators, latest, status: candleStatus } = useCandles();
  const { alerts, pendingCount, status: alertStatus } = useAlerts();

  // The "live" connection status reflects whichever WS we trust most —
  // they're identical sockets today but separating them lets future
  // iterations split them.
  const wsStatus = candleStatus === "open" ? candleStatus : alertStatus;

  // Compute the change % from the previous candle's close to the
  // latest. Returns null if we don't have at least 2 candles.
  const lastClose = latest?.close ?? null;
  const changePct = useMemo(() => {
    if (candles.length < 2 || latest === null) return null;
    const prev = candles[candles.length - 2];
    return computeChangePct(prev.close, latest.close);
  }, [candles, latest]);

  return (
    <div className="app">
      <Header
        health={health}
        wsStatus={wsStatus}
        lastClose={lastClose}
        changePct={changePct}
      />
      <SplitScreen
        left={<Chart candles={candles} indicators={indicators} />}
        right={<AlertsPanel alerts={alerts} pendingCount={pendingCount} status={wsStatus} />}
      />
    </div>
  );
}
