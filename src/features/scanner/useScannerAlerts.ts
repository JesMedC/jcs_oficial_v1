/*
 * useScannerAlerts — Market Analyzer Bot WebSocket hook.
 *
 * Opens a WebSocket to `${API_BASE}/api/v1/scanner/ws?token=<jwt>` and
 * streams live scanner alerts to the dashboard. The browser cannot
 * attach custom headers to `new WebSocket(url)` so the access token
 * is sent as a query parameter — the backend's WS auth handler picks
 * it up from `websocket.query_params` (see `app/api/v1/scanner.py`).
 *
 * Behaviour:
 *   - Reconnects on disconnect with exponential backoff
 *     (1s, 2s, 4s, 8s, 16s, max 30s) so transient network blips
 *     don't permanently silence the scanner.
 *   - Caps the in-memory alert list to the last 20 entries so we
 *     don't accumulate unbounded state over a long-running tab.
 *   - Exposes a `clear()` helper so the toast host can wipe the
 *     local list after dismissing every visible toast (the cap is
 *     only enforced on insert; a manual clear is the user-driven
 *     reset).
 *
 * Test-friendliness:
 *   - The `WebSocket` constructor is resolved via a tiny indirection
 *     (``resolveWebSocket``) that defaults to the global constructor
 *     but can be overridden in tests. This avoids monkey-patching
 *     `globalThis` which can leak across tests.
 *   - The hook only mounts the WS once per hook lifetime; tests
 *     using `renderHook` get a fresh WS on each mount.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { tokenStore } from '../../lib/api/client';

export type AlertDirection = 'PUT' | 'CALL';

export interface AlertIndicators {
  readonly stoch_value: number;
  readonly price_distance_ema: string;
}

export interface ScannerAlert {
  readonly pair: string;
  readonly direction: AlertDirection;
  readonly investment_amount_calc: string;
  readonly expiration_time: string;
  readonly timestamp: string;
  readonly indicators: AlertIndicators;
}

interface UseScannerAlerts {
  readonly alerts: readonly ScannerAlert[];
  readonly clear: () => void;
  readonly connected: boolean;
}

const MAX_ALERTS = 20;
// Backoff schedule — last entry is the cap.
const BACKOFF_DELAYS_MS: readonly number[] = [1000, 2000, 4000, 8000, 16000, 30000];

function getApiBase(): string {
  // Mirror `lib/api/client.ts` and `lib/analytics/pageview.ts` —
  // relative `/api/v1` works behind the Vite dev proxy AND the
  // production nginx setup. `VITE_API_BASE_URL` overrides for
  // exotic topologies.
  const env = import.meta.env.VITE_API_BASE_URL;
  return (env as string | undefined) ?? '/api/v1';
}

function deriveWsBase(apiBase: string): string {
  // http://x → ws://x ; https://x → wss://x. Falls through unchanged
  // when the URL is protocol-relative (e.g. /api/v1) because the
  // browser picks ws/wss automatically for `new WebSocket(url)`.
  if (apiBase.startsWith('http://')) return `ws://${apiBase.slice('http://'.length)}`;
  if (apiBase.startsWith('https://')) return `wss://${apiBase.slice('https://'.length)}`;
  return apiBase;
}

function backoffDelay(attempt: number): number {
  const idx = Math.min(attempt, BACKOFF_DELAYS_MS.length - 1);
  // ``noUncheckedIndexedAccess`` widens to ``number | undefined``; the
  // ``idx`` is always in-range so the explicit fallback is redundant
  // but keeps strict-mode happy.
  const base: number = BACKOFF_DELAYS_MS[idx] ?? 30000;
  // Add up to 25% jitter so reconnect storms desync across tabs.
  const jitter = base * 0.25 * Math.random();
  return base + jitter;
}

function resolveWebSocket(): typeof WebSocket {
  if (typeof globalThis !== 'undefined' && typeof globalThis.WebSocket === 'function') {
    return globalThis.WebSocket;
  }
  // Defensive fallback — should never run in the browser.
  return WebSocket;
}

export function useScannerAlerts(): UseScannerAlerts {
  const [alerts, setAlerts] = useState<readonly ScannerAlert[]>([]);
  const [connected, setConnected] = useState<boolean>(false);
  // refs let the WS callbacks see the latest state without resubscribing.
  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef<number>(0);
  const cancelledRef = useRef<boolean>(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback((): void => {
    setAlerts([]);
  }, []);

  useEffect(() => {
    cancelledRef.current = false;

    function open(): void {
      if (cancelledRef.current) return;
      const token = tokenStore.getAccess();
      if (token === null || token === '') {
        // No session — silently back off. The hook will retry once
        // the user logs in (re-render). Avoid busy-looping.
        scheduleReconnect();
        return;
      }
      const WsCtor = resolveWebSocket();
      const url = `${deriveWsBase(getApiBase())}/scanner/ws?token=${encodeURIComponent(token)}`;
      let socket: WebSocket;
      try {
        socket = new WsCtor(url);
      } catch {
        scheduleReconnect();
        return;
      }
      wsRef.current = socket;

      socket.onopen = (): void => {
        attemptRef.current = 0;
        setConnected(true);
      };

      socket.onmessage = (event: MessageEvent<string>): void => {
        const raw = event.data;
        if (typeof raw !== 'string') return;
        try {
          const parsed = JSON.parse(raw) as unknown;
          if (!isAlertPayload(parsed)) {
            // Non-alert frames (e.g. the {"event":"ready"} ack) are
            // intentionally ignored — they have no UI surface.
            return;
          }
          setAlerts((prev) => {
            const next = [parsed, ...prev];
            return next.length > MAX_ALERTS ? next.slice(0, MAX_ALERTS) : next;
          });
        } catch {
          // Malformed frames are dropped silently — the scanner
          // contract is text-JSON.
        }
      };

      socket.onclose = (): void => {
        setConnected(false);
        wsRef.current = null;
        scheduleReconnect();
      };

      socket.onerror = (): void => {
        // ``onclose`` will fire right after — let it handle the reconnect.
      };
    }

    function scheduleReconnect(): void {
      if (cancelledRef.current) return;
      if (reconnectTimerRef.current !== null) return;
      const delay = backoffDelay(attemptRef.current);
      attemptRef.current += 1;
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        open();
      }, delay);
    }

    open();

    return () => {
      cancelledRef.current = true;
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      const socket = wsRef.current;
      wsRef.current = null;
      if (socket !== null) {
        try {
          socket.close();
        } catch {
          // already closed — ignore.
        }
      }
    };
  }, []);

  return { alerts, clear, connected };
}

function isAlertPayload(value: unknown): value is ScannerAlert {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v['pair'] !== 'string') return false;
  if (v['direction'] !== 'PUT' && v['direction'] !== 'CALL') return false;
  if (typeof v['investment_amount_calc'] !== 'string') return false;
  if (typeof v['expiration_time'] !== 'string') return false;
  if (typeof v['timestamp'] !== 'string') return false;
  const indicators = v['indicators'];
  if (typeof indicators !== 'object' || indicators === null) return false;
  const ind = indicators as Record<string, unknown>;
  if (typeof ind['stoch_value'] !== 'number') return false;
  if (typeof ind['price_distance_ema'] !== 'string') return false;
  return true;
}