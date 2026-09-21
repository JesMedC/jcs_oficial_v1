// useAlerts — live alerts list subscribed to the same /ws WebSocket
// that useCandles uses. Because we share the upstream socket, this hook
// opens its own WS rather than sharing state — that keeps each hook
// independent and unit-testable.

import { useEffect, useReducer, useState } from "react";

import type {
  Alert,
  AlertNewMessage,
  AlertUpdateMessage,
  ConnectionStatus,
  UseAlertsResult,
} from "../types";

const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;

interface AlertsState {
  alerts: Alert[];
  pendingCount: number;
}

type AlertsAction =
  | { type: "seed"; alerts: Alert[] }
  | { type: "alert_new"; alert: Alert }
  | { type: "alert_update"; alert: Alert };

function computePendingCount(alerts: Alert[]): number {
  let count = 0;
  for (const a of alerts) if (a.status === "PENDING") count += 1;
  return count;
}

function sortByEntryTimeDesc(alerts: Alert[]): Alert[] {
  return [...alerts].sort((a, b) => {
    if (a.entry_time < b.entry_time) return 1;
    if (a.entry_time > b.entry_time) return -1;
    return 0;
  });
}

function dedupe(alerts: Alert[]): Alert[] {
  const seen = new Set<string>();
  const out: Alert[] = [];
  for (const a of alerts) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    out.push(a);
  }
  return out;
}

function alertsReducer(state: AlertsState, action: AlertsAction): AlertsState {
  switch (action.type) {
    case "seed": {
      const sorted = sortByEntryTimeDesc(action.alerts);
      return { alerts: sorted, pendingCount: computePendingCount(sorted) };
    }
    case "alert_new": {
      const next = dedupe([action.alert, ...state.alerts]);
      return { alerts: next, pendingCount: computePendingCount(next) };
    }
    case "alert_update": {
      const next = state.alerts.map((a) =>
        a.id === action.alert.id ? action.alert : a,
      );
      const sorted = sortByEntryTimeDesc(next);
      return { alerts: sorted, pendingCount: computePendingCount(sorted) };
    }
  }
}

export function useAlerts(): UseAlertsResult {
  const [state, dispatch] = useReducer(alertsReducer, {
    alerts: [],
    pendingCount: 0,
  });
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: number | null = null;
    let reconnectAttempts = 0;
    let ws: WebSocket | null = null;

    function connect() {
      if (cancelled) return;
      setStatus("connecting");
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${protocol}//${window.location.host}/ws`;
      ws = new WebSocket(url);

      ws.onopen = () => {
        if (cancelled) return;
        setStatus("open");
        reconnectAttempts = 0;
      };

      ws.onmessage = (ev: MessageEvent<string>) => {
        if (cancelled) return;
        try {
          const msg = JSON.parse(ev.data) as { type: string };
          if (msg.type === "alert_new") {
            dispatch({
              type: "alert_new",
              alert: (msg as AlertNewMessage).alert,
            });
          } else if (msg.type === "alert_update") {
            dispatch({
              type: "alert_update",
              alert: (msg as AlertUpdateMessage).alert,
            });
          }
        } catch (err: unknown) {
          console.warn("useAlerts: failed to parse message", err);
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        setStatus("closed");
        const attempt = reconnectAttempts++;
        const delay = Math.min(
          BASE_BACKOFF_MS * 2 ** attempt,
          MAX_BACKOFF_MS,
        );
        reconnectTimer = window.setTimeout(connect, delay);
      };

      ws.onerror = (ev: Event) => {
        // onclose fires after onerror; the close handler reconnects.
        console.warn("useAlerts: ws error", ev);
      };
    }

    // Seed from REST.
    fetch("/api/alerts")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ alerts: Alert[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        dispatch({ type: "seed", alerts: data.alerts ?? [] });
      })
      .catch((err: unknown) => {
        console.warn("useAlerts: REST seed failed", err);
      });

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      }
    };
  }, []);

  return {
    alerts: state.alerts,
    pendingCount: state.pendingCount,
    status,
  };
}
