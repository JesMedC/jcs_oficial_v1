// useBackendHealth — polls /healthz every 5 seconds to surface the
// provider + symbol in the header. The hook is intentionally minimal:
// it does not gate the rest of the UI on the backend being up because
// the WebSocket already exposes the live state via its own status.

import { useEffect, useState } from "react";

import type { HealthResponse } from "../types";

const POLL_INTERVAL_MS = 5000;

export interface BackendHealth {
  provider: string | null;
  symbol: string | null;
  isUp: boolean;
  lastChecked: Date | null;
}

const initialHealth: BackendHealth = {
  provider: null,
  symbol: null,
  isUp: false,
  lastChecked: null,
};

export function useBackendHealth(): BackendHealth {
  const [health, setHealth] = useState<BackendHealth>(initialHealth);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/healthz");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as HealthResponse;
        if (cancelled) return;
        setHealth({
          provider: data.provider,
          symbol: data.symbol,
          isUp: data.status === "ok",
          lastChecked: new Date(),
        });
      } catch (err: unknown) {
        if (cancelled) return;
        setHealth((prev) => ({ ...prev, isUp: false, lastChecked: new Date() }));
      }
    }

    poll();
    const id = window.setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return health;
}
