/*
 * useEquityCurve — 15-day rolling balance + performance evolution for
 * the Dashboard.
 *
 * Pulls per-day ``day_start_balance`` + ``pnl_pct`` from the calendar
 * endpoint (which is the provisional Trade-ledger walk until the
 * account-movement-ledger WIP ships) and reconstructs end-of-day
 * values for the requested window.
 *
 * FASE 6 — Diario redesign:
 *   - Returns TWO lines per day, distinguished by base:
 *     * ``account_balance`` = contable (real broker balance, includes
 *       deposits / withdrawals).
 *     * ``cumulative_net_pnl`` = operations-only (first fund + Σ
 *       trading P&L up to that day; excludes capital movements).
 *   - Returns a ``capital_volume`` per day = Σ FUND − Σ WITHDRAW,
 *     used by the volume-bars sub-chart at the bottom of the
 *     equity panel.
 *
 * Window strategy: always emit exactly ``days`` points, oldest → newest.
 * Days with no trading activity keep the previous day's end balance
 * (a flat segment — exactly what the user expects to see for a quiet
 * weekend or early-window days). For days that fall OUTSIDE the
 * current calendar month (the window can span two months at month
 * boundaries), the hook fetches the previous month too and stitches
 * the response.
 *
 * Trade input is REQUIRED so we can compute the operations-only
 * balance. The parent (DashboardPage) already fetches ``useTradesAll``
 * — we just thread that list through to avoid a second round-trip.
 *
 * The hook is intentionally read-only and orthogonal to ``usePnLCalendar``
 * so the Diario (calendar grid) and the Dashboard (rolling line) can
 * coexist on different keys / refetch cadences without contention.
 */
import { useMemo } from 'react';

import {
  usePnLCalendar,
  type PnlDayEntry,
  type PnlCalendarMonth,
} from './hooks';
import type { TradeOut } from '../trades/types';

/* -------------------- types -------------------- */

interface EquityCurvePoint {
  /** ISO date YYYY-MM-DD — the day bucket. */
  readonly date: string;
  /** End-of-day CONTABLE balance in USD (includes deposits / withdrawals). */
  readonly account_balance: number;
  /** Cumulative trading P&L up to and INCLUDING that day (Σ
   *  ``pnl_usd`` of FOREX/BINARY trades opened through this date).
   *  Excludes the initial FUND so the chart anchors at $0 instead of
   *  at the first-fund amount — i.e. this is the trading profit
   *  earned ABOVE the starting capital, not the ops-only balance. */
  readonly cumulative_net_pnl: number;
  /** Net trading P&L realised on THIS day only (Σ pnl_usd of
   *  FOREX/BINARY trades whose ``opened_at`` falls on ``date``).
   *  Drives the PerformanceCurveChart histogram so each bar is
   *  one day: +X for a winning day, −X for a losing day, 0 for
   *  a quiet day. */
  readonly daily_pnl: number;
  /** Net capital volume for the day (Σ FUND − Σ WITHDRAW). Drives the
   *  bottom volume-bars sub-chart. */
  readonly capital_volume: number;
  /** Trade count for the day (FOREX + BINARY + FUND + WITHDRAW). */
  readonly trades: number;
}

interface EquityCurveResult {
  /** Per-day points in chronological order. */
  readonly points: ReadonlyArray<EquityCurvePoint>;
  /** ISO dates flagged as deposit/withdrawal days. */
  readonly injectionDates: ReadonlyArray<string>;
  readonly isLoading: boolean;
  readonly isError: boolean;
}

/* -------------------- helpers -------------------- */

/** YYYY-MM-DD for ``today − offsetDays`` (offsetDays = 0 → today). */
function dayOffsetIso(offsetDays: number, today: Date = new Date()): string {
  const d = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  d.setUTCDate(d.getUTCDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

/** "YYYY-MM" for ``today − offsetDays``. */
function monthOfDayOffset(offsetDays: number, today: Date = new Date()): string {
  return dayOffsetIso(offsetDays, today).slice(0, 7);
}

function buildDayMap(
  days: ReadonlyArray<PnlDayEntry>,
): Map<string, { startBalance: number; pnlPct: number; trades: number }> {
  const out = new Map<
    string,
    { startBalance: number; pnlPct: number; trades: number }
  >();
  for (const d of days) {
    out.set(d.date, {
      startBalance: Number(d.day_start_balance),
      pnlPct: d.pnl_pct,
      trades: d.ops_count,
    });
  }
  return out;
}

function endBalance(start: number, pnlPct: number): number {
  return start * (1 + pnlPct);
}

/* -------------------- per-day ops-only + capital walk -------------------- */

/**
 * Build a ``Map<date, { dailyPnl, cumulativeNetPnl, capitalVolume }>``
 * from the parent-supplied ``tradesForDayPanel``.
 *
 * Two-pass walk:
 *   1. Aggregate per-day ``dailyPnl`` (Σ pnl_usd of FOREX/BINARY
 *      trades opened on that day) and ``capitalVolume`` (Σ FUND −
 *      Σ WITHDRAW on that day).
 *   2. Walk the window dates forward and accumulate ``dailyPnl`` into
 *      ``cumulativeNetPnl``.
 *
 * Crucially, ``cumulativeNetPnl`` does NOT add the first FUND
 * amount — that would conflate "trading profit" ($9.20 in the user's
 * example) with "ops-only balance" ($109.20 = firstFund + trading
 * profit). The PerformanceCurveChart legend wants the trading profit,
 * not the ops balance; the percentage KPIs compute their own ratio
 * against ``firstFundAmount`` so the two stay decoupled.
 *
 * Funding amount = the chronologically first FUND trade in the
 * dataset (used by the percentage KPIs as the "starting capital"
 * denominator, never added into the cumulative chart line).
 */
function buildOpsSeries(
  trades: ReadonlyArray<TradeOut>,
  windowDates: ReadonlyArray<string>,
): {
  byDate: Map<
    string,
    { cumulativeNetPnl: number; dailyPnl: number; capitalVolume: number }
  >;
  firstFundAmount: number;
} {
  const byDate = new Map<
    string,
    { cumulativeNetPnl: number; dailyPnl: number; capitalVolume: number }
  >();
  // Pre-seed every window date with zeros so the chart never shows
  // gaps on days without activity.
  for (const d of windowDates) {
    byDate.set(d, { cumulativeNetPnl: 0, dailyPnl: 0, capitalVolume: 0 });
  }

  const sorted = [...trades].sort((a, b) =>
    a.opened_at < b.opened_at ? -1 : a.opened_at > b.opened_at ? 1 : 0,
  );

  let firstFundAmount = 0;
  let firstFundFound = false;

  // Pass 1 — aggregate per-day dailyPnl + capitalVolume (and capture
  // firstFundAmount as a side effect for the percentage KPIs).
  for (const t of sorted) {
    const date = t.opened_at.slice(0, 10);
    if (!firstFundFound && t.type === 'FUND') {
      firstFundAmount = Number(t.investment_usd ?? 0);
      firstFundFound = true;
    }
    if (!byDate.has(date)) continue; // outside the requested window
    const slot = byDate.get(date)!;
    if (t.type === 'FOREX' || t.type === 'BINARY') {
      slot.dailyPnl += Number(t.pnl_usd ?? 0);
    } else if (t.type === 'FUND') {
      slot.capitalVolume += Number(t.investment_usd ?? 0);
    } else if (t.type === 'WITHDRAW') {
      slot.capitalVolume -= Number(t.investment_usd ?? 0);
    }
  }

  // Pass 2 — walk window dates forward, accumulate dailyPnl into
  // cumulativeNetPnl (no firstFund — that's the fix). Days BEFORE
  // the window contribute their P&L via the bootstrap cumulative
  // computed below; days AFTER the window are ignored.
  const sortedDates = [...windowDates].sort();
  const firstDate = sortedDates[0];
  let preWindowCumulative = 0;
  if (firstDate !== undefined) {
    for (const t of sorted) {
      if (t.opened_at.slice(0, 10) < firstDate) {
        if (t.type === 'FOREX' || t.type === 'BINARY') {
          preWindowCumulative += Number(t.pnl_usd ?? 0);
        }
      }
    }
  }
  let running = preWindowCumulative;
  for (const d of sortedDates) {
    const slot = byDate.get(d)!;
    running += slot.dailyPnl;
    slot.cumulativeNetPnl = running;
  }

  // Edge case — account with trades but never funded. The backend
  // treats this as "ops_balance = current balance" (no firstFund).
  // Mirror that: cumulative stays as the running sum.
  if (!firstFundFound) {
    firstFundAmount = 0;
  }
  return { byDate, firstFundAmount };
}

/* -------------------- hook -------------------- */

interface EquityCurveArgs {
  readonly workspaceId: string;
  /** Closed-trade history for the active scope. Required so we can
   *  compute the operations-only balance per day without a second
   *  round-trip — pass the same list you feed to ``<PnLCalendar />``. */
  readonly tradesForDayPanel: ReadonlyArray<TradeOut>;
  readonly accountId?: string | null;
  readonly days?: number;
  readonly tz?: string | null;
  /**
   * Real broker-reported balance for the same scope as
   * ``tradesForDayPanel``. Anchors the chart's last point so the
   * capital curve ENDS at the user's current balance (instead of
   * at the calendar-derived ``day_start × (1 + pnl_pct)``
   * approximation, which drifts whenever FUND/WITHDRAW happen
   * mid-window and produces a visible spike on the last day).
   */
  readonly currentBalance?: number | null;
}

/**
 * Fetches per-day balance for the last ``days`` (default 15) and emits
 * ``EquityCurvePoint[]`` ready for ``<PerformanceCurveChart />`` and
 * ``<CapitalCurveChart />`` (the dashboard split the original
 * two-line chart into two stacked single-line cards).
 *
 * Disabled while ``workspaceId`` is empty (mirrors ``usePnLCalendar``).
 */
export function useEquityCurve({
  workspaceId,
  tradesForDayPanel,
  accountId = null,
  days = 15,
  tz = null,
  currentBalance = null,
}: EquityCurveArgs): EquityCurveResult {
  const currentMonth = useMemo(() => monthOfDayOffset(0), []);
  const oldestDayOffset = days - 1;
  const previousMonth = useMemo(
    () => monthOfDayOffset(oldestDayOffset),
    [oldestDayOffset],
  );

  const currentQ = usePnLCalendar({
    workspaceId,
    month: currentMonth,
    accountId,
    tz,
  });
  const previousQ = usePnLCalendar({
    workspaceId,
    month: previousMonth,
    accountId,
    tz,
  });

  const enabled = workspaceId.length > 0;

  const result = useMemo<EquityCurveResult>(() => {
    if (!enabled) {
      return {
        points: [],
        injectionDates: [],
        isLoading: false,
        isError: false,
      };
    }

    const today = new Date();
    const dayMap = buildDayMap([
      ...(previousQ.data?.days ?? []),
      ...(currentQ.data?.days ?? []),
    ]);

    // Pre-compute the window's date strings so the per-day ops walk
    // has a stable seed for days with no activity.
    const windowDates: string[] = [];
    for (let i = oldestDayOffset; i >= 0; i -= 1) {
      windowDates.push(dayOffsetIso(i, today));
    }
    const opsSeries = buildOpsSeries(tradesForDayPanel, windowDates);

    // CLIENT-SIDE capital walk. Anchored to ``currentBalance``
    // (the broker-reported total for the active scope) so the
    // curve ENDS at the user's real balance regardless of any
    // calendar pnl_pct drift. We compute per-day net effect
    // (trading_pnl + FUND − WITHDRAW) from ``tradesForDayPanel``
    // and walk the balance backwards day-by-day from today.
    //
    // Fallback: if the caller didn't supply ``currentBalance``
    // we still seed from the calendar's first-known day so the
    // chart renders something instead of crashing — but the last
    // point will not match the broker balance in that case.
    let bootstrapBalance: number | null = null;
    if (currentBalance !== null && Number.isFinite(currentBalance)) {
      bootstrapBalance = currentBalance;
    } else {
      for (let i = oldestDayOffset; i >= 0; i -= 1) {
        const date = dayOffsetIso(i, today);
        const entry = dayMap.get(date);
        if (entry !== undefined) {
          bootstrapBalance = endBalance(entry.startBalance, entry.pnlPct);
          break;
        }
      }
    }
    if (bootstrapBalance === null) {
      return {
        points: [],
        injectionDates: [],
        isLoading: currentQ.isLoading || previousQ.isLoading,
        isError: currentQ.isError || previousQ.isError,
      };
    }
    const accountBalanceByDate = buildContableWalk(
      tradesForDayPanel,
      windowDates,
      bootstrapBalance,
    );

    const points: EquityCurvePoint[] = [];
    const injectionDates: string[] = [];

    for (let i = oldestDayOffset; i >= 0; i -= 1) {
      const date = dayOffsetIso(i, today);
      const entry = dayMap.get(date);
      const ops = opsSeries.byDate.get(date) ?? {
        cumulativeNetPnl: 0,
        dailyPnl: 0,
        capitalVolume: 0,
      };
      const trades = entry?.trades ?? 0;
      const volume = ops.capitalVolume;
      const accountBalance = accountBalanceByDate.get(date) ?? bootstrapBalance;
      if (volume !== 0) injectionDates.push(date);
      points.push({
        date,
        account_balance: round2(accountBalance),
        // Just the trading profit above the initial fund, no
        // ``firstFundAmount`` baked in. The chart legend reports
        // this as "+$X.XX" — e.g. +$9.20 for a user who started
        // with $100 and is now at $109.20.
        cumulative_net_pnl: round2(ops.cumulativeNetPnl),
        // Per-day trading P&L — drives the PerformanceCurveChart
        // histogram (one bar per day, green for wins, red for losses).
        daily_pnl: round2(ops.dailyPnl),
        capital_volume: round2(volume),
        trades,
      });
    }

    return {
      points,
      injectionDates,
      isLoading: currentQ.isLoading || previousQ.isLoading,
      isError: currentQ.isError || previousQ.isError,
    };
  }, [
    enabled,
    oldestDayOffset,
    currentQ.data,
    previousQ.data,
    currentQ.isLoading,
    previousQ.isLoading,
    currentQ.isError,
    previousQ.isError,
    tradesForDayPanel,
    currentBalance,
  ]);

  return result;
}

/* -------------------- per-day contable walk -------------------- */

/**
 * Walk the account balance day-by-day from ``currentBalance`` backwards
 * through the window, subtracting each day's net effect
 * (``trading_pnl + FUND − WITHDRAW``). The map's last key
 * (today, the rightmost in the sorted window) holds exactly
 * ``currentBalance`` — that's what the dashboard capital curve
 * wants its right edge to show.
 */
function buildContableWalk(
  trades: ReadonlyArray<TradeOut>,
  windowDates: ReadonlyArray<string>,
  currentBalance: number,
): Map<string, number> {
  // Per-day net effect from ``tradesForDayPanel``. Trades outside the
  // window are ignored — they're already baked into ``currentBalance``.
  const effectsByDate = new Map<string, number>();
  for (const d of windowDates) {
    effectsByDate.set(d, 0);
  }
  for (const t of trades) {
    const date = t.opened_at.slice(0, 10);
    if (!effectsByDate.has(date)) continue;
    let effect = 0;
    if (t.type === 'FOREX' || t.type === 'BINARY') {
      effect += Number(t.pnl_usd ?? 0);
    } else if (t.type === 'FUND') {
      effect += Number(t.investment_usd ?? 0);
    } else if (t.type === 'WITHDRAW') {
      effect -= Number(t.investment_usd ?? 0);
    }
    effectsByDate.set(date, (effectsByDate.get(date) ?? 0) + effect);
  }

  // Walk newest → oldest, peeling today's effect off ``currentBalance``
  // to recover yesterday's end balance, then the day before that, etc.
  const sortedDates = [...windowDates].sort();
  const endBalanceByDate = new Map<string, number>();
  let running = currentBalance;
  for (let i = sortedDates.length - 1; i >= 0; i -= 1) {
    const d = sortedDates[i]!;
    endBalanceByDate.set(d, running);
    running -= effectsByDate.get(d) ?? 0;
  }
  return endBalanceByDate;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/* Re-export so tests / consumers can stub the API client without
 * touching the internals of TanStack Query. */
export const __test = { dayOffsetIso, monthOfDayOffset, endBalance };

// Type-only re-export to keep callers from importing the same
// `PnlCalendarMonth` from two different paths when they wire up
// fixtures for tests.
export type { PnlCalendarMonth };