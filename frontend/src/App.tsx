// App — top-level composition.
//
// Renders:
//
// - ``Header``           — symbol, last close, connection dot
// - ``SplitScreen``      — 70/30 flex layout
//   - left  → ``TradingViewChart`` (TradingView Advanced Chart widget)
//   - right → ``AlertsPanel``       (live alerts table)
//
// State ownership:
//
// - ``chartSymbol`` lives here so the alert row click in ``AlertsPanel``
//   can drive the chart's symbol without prop-drilling through an extra
//   layer. The default is the backend's reported symbol, falling back
//   to ``EUR/USD`` while the /healthz poll is still in flight.
// - TV05 will add a ``selectedAlert`` state and the click handler that
//   wires row clicks to ``setChartSymbol`` + ``setSelectedAlert``.
//
// Data sources (honest contract — see README):
//
// - Chart pixels:        TradingView widget (real-time forex feed).
// - Candles / indicators / alerts: Dukascopy via the FastAPI backend.
// The two streams tick independently; the scanner engine is
// authoritative for WIN/LOSS resolution, the widget is authoritative
// for "what the user is looking at right now".

import { useCallback, useMemo, useState } from "react";

import { AlertCard } from "./components/AlertCard";
import { AlertsPanel } from "./components/AlertsPanel";
import { Header } from "./components/Header";
import { SplitScreen } from "./components/SplitScreen";
import { TradingViewChart } from "./components/TradingViewChart";

import "./App.css";
import { useAlerts } from "./hooks/useAlerts";
import { useBackendHealth } from "./hooks/useBackendHealth";
import { useCandles } from "./hooks/useCandles";
import { computeChangePct } from "./utils/format";
import type { Alert } from "./types";

/** Fallback symbol while the backend has not yet reported one. */
const DEFAULT_CHART_SYMBOL = "EUR/USD";

export default function App() {
  const health = useBackendHealth();
  // Indicators are no longer threaded through App — the TradingView
  // widget displays its own data and the Dukascopy buffer is now an
  // internal scanner concern. ``useCandles`` still exposes them for
  // future use; we deliberately ignore them at the App level for now.
  const { candles, latest, status: candleStatus } = useCandles();
  const { alerts, pendingCount, status: alertStatus } = useAlerts();

  // The chart's symbol starts as the backend's symbol, or the
  // documented fallback if /healthz has not yet responded. TV05
  // wires the alert-row click to this setter.
  const initialSymbol = health.symbol ?? DEFAULT_CHART_SYMBOL;
  const [chartSymbol, setChartSymbol] = useState<string>(initialSymbol);

  // The currently expanded alert (its detail card sits under the
  // table). ``null`` means no card is open. We keep the ID separate
  // from the symbol because the chart should follow the latest row
  // click while the card can stay open / be dismissed independently.
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  const handleSelectAlert = useCallback((alert: Alert) => {
    setChartSymbol(alert.symbol);
    setSelectedAlert(alert);
  }, []);

  const handleCloseAlert = useCallback(() => {
    setSelectedAlert(null);
  }, []);

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
        left={<TradingViewChart symbol={chartSymbol} />}
        right={
          <>
            <AlertsPanel
              alerts={alerts}
              pendingCount={pendingCount}
              status={wsStatus}
              onSelect={handleSelectAlert}
              selectedAlertId={selectedAlert?.id ?? null}
            />
            {selectedAlert && (
              <AlertCard alert={selectedAlert} onClose={handleCloseAlert} />
            )}
          </>
        }
      />
    </div>
  );
}
