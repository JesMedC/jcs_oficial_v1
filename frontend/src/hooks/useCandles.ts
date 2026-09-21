// useCandles — live 5-minute candle buffer + indicator overlays.
//
// Behaviour:
//
// 1. On mount, GET /api/candles?limit=500 seeds the buffer so the chart
//    can render immediately while the WebSocket handshake completes.
// 2. A WebSocket to /ws is opened; the backend sends a ``hello`` snapshot
//    that we use to fully replace the seed (the REST fetch can race with
//    the WS and we want the WS to win because it's authoritative).
// 3. On every ``candle`` tick the backend pushes the full rolling buffer
//    plus the indicator series — we replace the state wholesale to keep
//    the chart and the indicators perfectly aligned.
// 4. The buffer is capped at 500 candles on every state transition so
//    long-running sessions cannot leak memory.
// 5. Disconnects schedule a reconnect with exponential backoff
//    (1s, 2s, 4s, ... capped at 30s). The status reflects the current
//    socket state so the UI can render the connection dot.
//
// The reducer functions are exported as pure helpers so the WS message
// handling logic is fully unit-testable without spinning up a browser.

import { useEffect, useRef, useState } from "react";

import type {
  Candle,
  CandleMessage,
  ConnectionStatus,
  HelloMessage,
  IndicatorsPayload,
  UseCandlesResult,
} from "../types";

/** Hard cap on the candles buffer. Matches the backend default. */
export const BUFFER_CAP = 500;

/** Reconnect backoff bounds. */
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;

/** Hook state — what the reducer functions read + return. */
export interface CandlesState {
  candles: Candle[];
  indicators: IndicatorsPayload | null;
}

export const initialCandlesState: CandlesState = {
  candles: [],
  indicators: null,
};

/** Drop the oldest candles until the array fits inside the cap. */
export function capCandles(candles: Candle[]): Candle[] {
  if (candles.length <= BUFFER_CAP) return candles;
  return candles.slice(-BUFFER_CAP);
}

/** Pure reducer: apply a ``hello`` snapshot. Replaces state wholesale. */
export function applyHello(msg: HelloMessage): CandlesState {
  return {
    candles: capCandles(msg.candles),
    indicators: msg.indicators,
  };
}

/** Pure reducer: apply a ``candle`` tick. Replaces state with the
 *  rolling buffer that the backend ships in every tick. */
export function applyCandleTick(msg: CandleMessage): CandlesState {
  return {
    candles: capCandles(msg.buffer),
    indicators: msg.indicators,
  };
}

/** Pure reducer: seed from the REST ``GET /api/candles`` response. */
export function applyCandlesSeed(
  state: CandlesState,
  candles: Candle[],
): CandlesState {
  return {
    ...state,
    candles: capCandles(candles),
  };
}

/**
 * Subscribe to the candle + indicator WebSocket stream and return the
 * current buffer plus connection status.
 */
export function useCandles(): UseCandlesResult {
  const [state, setState] = useState<CandlesState>(initialCandlesState);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    // 1. Seed from REST (best-effort; the WS hello snapshot is the
    //    authoritative replacement).
    fetch("/api/candles?limit=500")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ candles: Candle[] }>;
      })
      .then((data) => {
        if (cancelledRef.current) return;
        setState((prev) => applyCandlesSeed(prev, data.candles ?? []));
      })
      .catch((err: unknown) => {
        // Non-fatal: WS will deliver a hello snapshot momentarily.
        console.warn("useCandles: REST seed failed", err);
      });

    // 2. Open the WS. Reconnects with exponential backoff on close.
    function connect() {
      if (cancelledRef.current) return;
      setStatus("connecting");

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelledRef.current) return;
        setStatus("open");
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (ev: MessageEvent<string>) => {
        if (cancelledRef.current) return;
        try {
          const msg = JSON.parse(ev.data) as { type: string };
          if (msg.type === "hello") {
            setState(() => applyHello(msg as HelloMessage));
          } else if (msg.type === "candle") {
            setState(() => applyCandleTick(msg as CandleMessage));
          }
          // alert_new / alert_update are handled by useAlerts.
        } catch (err: unknown) {
          console.warn("useCandles: failed to parse message", err);
        }
      };

      ws.onclose = () => {
        if (cancelledRef.current) return;
        setStatus("closed");
        const attempt = reconnectAttemptsRef.current++;
        const delay = Math.min(
          BASE_BACKOFF_MS * 2 ** attempt,
          MAX_BACKOFF_MS,
        );
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      };

      ws.onerror = (ev: Event) => {
        // onclose fires after onerror; let the close handler reconnect.
        console.warn("useCandles: ws error", ev);
      };
    }

    connect();

    return () => {
      cancelledRef.current = true;
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      const ws = wsRef.current;
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
        wsRef.current = null;
      }
    };
  }, []);

  const latest =
    state.candles.length > 0 ? state.candles[state.candles.length - 1] : null;

  return {
    candles: state.candles,
    indicators: state.indicators,
    latest,
    status,
  };
}
