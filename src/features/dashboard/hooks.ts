/*
 * one-by-one-thousand-discipline (PR-2) — dashboard read hooks.
 *
 * Two TanStack Query hooks that wrap the PR-1 endpoints:
 *   - useSessionStats()     → GET /trades/session-stats
 *   - usePnLCalendar()      → GET /calendar/pnl
 *
 * Q1 hook-location decision (per design.md #185): colocated here
 * (NOT in `features/trades`) because the consumers are
 * DiarioPage / CuentasDetailPage / dashboard panels — the cohesion
 * is with the analytics views, not the trade CRUD surface.
 *
 * Defaults (staleTime: 30s, retry: 1, refetchOnWindowFocus: false)
 * are inherited from the global QueryClient. ``useSessionStats``
 * is the documented exception: it overrides ``staleTime`` and
 * ``refetchOnMount`` to force a network refetch on every mount so
 * a cached payload from a previous backend version cannot survive
 * across deploys (see the doc-block above the hook for the why).
 * Co-located query-key objects keep invalidations greppable from
 * one place when a future mutation needs to refresh them.
 */
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../../lib/api/client';
import type { SessionBand } from '../sessions';

/* -------------------- types (mirror backend schemas/trade.py) -------------------- */

// Re-export the shared SessionBand so existing dashboard consumers
// (`useSessionStats`, `WinrateBySessionCard`) keep their import
// surface unchanged after Slice B. Backend `Band` literal lives in
// `backend/app/services/session_service.py`; the frontend source of
// truth is `src/features/sessions/index.ts`.
export type { SessionBand };

/** Per-band tile from ``SessionStatsOut.sessions`` (REQ-WRS-001). */
export interface SessionTile {
  readonly trades: number;
  readonly wins: number;
  /** Integer-rounded winrate (REQ-WRS-004). */
  readonly winrate_pct: number;
}

export interface SessionStats {
  readonly workspace_id: string;
  /** ISO date YYYY-MM-DD (inclusive). */
  readonly date_from: string;
  /** ISO date YYYY-MM-DD (inclusive). */
  readonly date_to: string;
  readonly account_id: string | null;
  readonly sessions: Readonly<Record<SessionBand, SessionTile>>;
  readonly general: SessionTile;
}

export interface SessionStatsFilters {
  readonly workspaceId: string;
  /** YYYY-MM-DD (inclusive). */
  readonly dateFrom: string;
  /** YYYY-MM-DD (inclusive). */
  readonly dateTo: string;
  readonly accountId?: string | null;
}

export interface PnlDayEntry {
  /** ISO date YYYY-MM-DD. */
  readonly date: string;
  readonly ops_count: number;
  /** Decimal as string (USD). */
  readonly day_start_balance: string;
  /** Float percent (0.01 precision). */
  readonly pnl_pct: number;
}

export interface PnlCalendarMonth {
  readonly workspace_id: string;
  /** YYYY-MM. */
  readonly month: string;
  readonly month_start_balance: string;
  readonly month_end_balance: string;
  /** MONTHLY indicator (REQ-PNL-006 — never a per-day badge). */
  readonly cumple: boolean;
  readonly days: readonly PnlDayEntry[];
  // FASE 6 — Diario redesign (operations-vs-capital split).
  /** Operations-only base for ``monthly_rendimiento_pct``.
   *  = first fund (new account) or ops balance at month start. */
  readonly capital_base: string;
  /** Σ closed-trade pnl_usd in the month (FOREX/BINARY only). */
  readonly net_pnl_usd: string;
  /** ``net_pnl_usd / capital_base × 100``, quantised to 0.01. */
  readonly monthly_rendimiento_pct: number;
  /** Σ FUND amount in the month (capital in). */
  readonly monthly_deposits_total: string;
  /** Σ WITHDRAW amount in the month (capital out). */
  readonly monthly_withdrawals_total: string;
  // Older FASE 6 KPI fields kept for backward compat.
  readonly variacion_pct: number;
  readonly avg_pnl_pct: number;
}

export interface PnLCalendarFilters {
  readonly workspaceId: string;
  /** YYYY-MM. */
  readonly month: string;
  readonly accountId?: string | null;
  /**
   * FIX-4 — optional browser-TZ override. When the user's stored
   * ``users.timezone`` is still the legacy ``"UTC"`` backfill (race
   * condition with the AuthProvider auto-heal on first load), the
   * calendar would bucket trades on UTC dates. Passing the browser
   * TZ here is a defensive belt-and-suspenders fix: the backend
   * uses the override before falling back to ``user.timezone``.
   * Always IANA (e.g. ``"America/Santiago"``); falsy → backend uses
   * the stored TZ.
   */
  readonly tz?: string | null;
}

/* -------------------- query keys -------------------- */

export const dashboardKeys = {
  all: ['dashboard'] as const,
  sessionStats: (filters: SessionStatsFilters) =>
    [
      ...dashboardKeys.all,
      'session-stats',
      filters.workspaceId,
      filters.dateFrom,
      filters.dateTo,
      filters.accountId ?? null,
    ] as const,
  pnlCalendar: (filters: PnLCalendarFilters) =>
    [
      ...dashboardKeys.all,
      'pnl-calendar',
      filters.workspaceId,
      filters.month,
      filters.accountId ?? null,
      filters.tz ?? null,
    ] as const,
};

/* -------------------- fetches -------------------- */

async function fetchSessionStats(filters: SessionStatsFilters): Promise<SessionStats> {
  const { data } = await apiClient.get<SessionStats>('/trades/session-stats', {
    params: {
      workspace_id: filters.workspaceId,
      date_from: filters.dateFrom,
      date_to: filters.dateTo,
      ...(filters.accountId !== undefined && filters.accountId !== null
        ? { account_id: filters.accountId }
        : {}),
    },
  });
  return data;
}

async function fetchPnlCalendar(filters: PnLCalendarFilters): Promise<PnlCalendarMonth> {
  const { data } = await apiClient.get<PnlCalendarMonth>('/calendar/pnl', {
    params: {
      workspace_id: filters.workspaceId,
      month: filters.month,
      ...(filters.accountId !== undefined && filters.accountId !== null
        ? { account_id: filters.accountId }
        : {}),
      // FIX-4 — defensive TZ override. Sent only when the caller
      // (the dashboard page) has resolved a browser TZ. Empty /
      // falsy / "UTC" values are skipped so we don't override the
      // backend's stored preference with a no-op.
      ...(filters.tz !== undefined && filters.tz !== null && filters.tz !== ''
        ? { tz: filters.tz }
        : {}),
    },
  });
  return data;
}

/* -------------------- hooks -------------------- */

/**
 * 4-band session winrate tiles (REQ-WRS-001..005). Backend excludes
 * ``outcome=BREAK`` from the denominator (decision #4 #178) and reads
 * only ``Trade`` (movements-not-counted).
 *
 * Disabled when ``workspaceId`` is empty — callers usually derive
 * ``workspaceId`` from auth context and want to defer the fetch
 * until that's resolved.
 *
 * The two cache options below are deliberately aggressive: this query
 * is the dashboard headline and the cost of one extra HTTP round-trip
 * on mount is negligible compared to the cost of surfacing a stale
 * payload from a previous backend version (the partition-mismatch note
 * the user was seeing — bands=0, general=3). ``staleTime: 0`` makes
 * the entry immediately stale on every cache write; ``refetchOnMount:
 * 'always'`` forces the network fetch even when the cached entry is
 * still inside the global 30s fresh window. Combined, they guarantee
 * the cache cannot survive across a backend deploy without a fresh
 * response. No other hook option is touched — the query key, queryFn
 * and ``enabled`` predicate are unchanged so existing invalidations
 * keep working.
 */
export function useSessionStats(filters: SessionStatsFilters) {
  return useQuery<SessionStats>({
    queryKey: dashboardKeys.sessionStats(filters),
    queryFn: () => fetchSessionStats(filters),
    enabled: filters.workspaceId.length > 0,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

/**
 * Month-grid P&L + monthly ``cumple`` boolean (REQ-PNL-001..007).
 *
 * Backend (PR-1) computes day-start balance via the provisional
 * Python walk over the ``Trade`` ledger (per Engram #187 + design.md
 * ADR-001). Once the account-movement-ledger WIP merges, the backend
 * will swap to the snapshot read; the wire shape is stable so this
 * hook doesn't change.
 */
export function usePnLCalendar(filters: PnLCalendarFilters) {
  return useQuery<PnlCalendarMonth>({
    queryKey: dashboardKeys.pnlCalendar(filters),
    queryFn: () => fetchPnlCalendar(filters),
    enabled: filters.workspaceId.length > 0 && /^\d{4}-\d{2}$/.test(filters.month),
  });
}