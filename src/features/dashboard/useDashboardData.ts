/*
 * useDashboardData — Real-data aggregator for the institutional
 * dashboard. Replaces the previous seed-driven mockup with metrics
 * derived from the user's actual trades and accounts.
 *
 * Source of truth (read-only):
 *   - useAccounts()                 → balance actual + identity
 *   - useTradesAll({ limit: 500 })   → closed P&L history, market mix,
 *                                       pair stats, time-of-day mix,
 *                                       equity curve, drawdown, PF
 *
 * What we cannot compute from the existing backend (and therefore
 * stays neutral when there's no signal):
 *   - Currency strength (global, real-time): we approximate by
 *     inferring "user-traded volume per currency" — useful as a
 *     relative dashboard signal but not as a global strength meter.
 *   - Discipline score: we approximate from `followed_plan` rate
 *     on closed trades (a soft heuristic — see Metric "Discipline").
 *
 * Heavy number crunching lives in plain pure helpers below so the
 * consumers stay simple and the numbers are testable.
 */
import { useMemo } from 'react';

import { useAccounts } from '../accounts/hooks';
import { useTradesAll } from '../trades/useTradesAll';
import type { TradeOut } from '../trades/types';
import type {
  AdvancedMetrics,
  CashflowSummary,
  CurrencyStrength,
  HeatmapCell,
  MarketSlice,
  PairStat,
  PnlPoint,
} from './types';

export interface DashboardData {
  readonly equityCurve: ReadonlyArray<PnlPoint>;
  readonly cashflow: CashflowSummary;
  readonly market: ReadonlyArray<MarketSlice>;
  readonly topPairs: ReadonlyArray<PairStat>;
  readonly currencyStrength: ReadonlyArray<CurrencyStrength>;
  readonly monthlyHeatmap: ReadonlyArray<ReadonlyArray<HeatmapCell>>;
  readonly timeHeatmap: ReadonlyArray<ReadonlyArray<HeatmapCell>>;
  readonly advanced: AdvancedMetrics;
  readonly winRate: number;
  /** Total trade count (open + closed). */
  readonly totalTrades: number;
  /** Trades still OPEN (no P&L yet). */
  readonly openTrades: number;
  /** True when there's at least one trade in any state. */
  readonly hasAnyTrade: boolean;
}

/* -------------------- pure helpers -------------------- */

function startOfDay(iso: string): string {
  return iso.slice(0, 10);
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function safeNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Equity curve: cumulative P&L ordered ascending by `closed_at`,
 * bucketed per day. Open trades are skipped (they have no P&L yet),
 * and FUND/WITHDRAW rows are excluded because they're capital
 * movements, not trading outcomes — mixing them in would distort the
 * curve (a $1,000 deposit would show as a fake "gain").
 */
function computeEquityCurve(trades: ReadonlyArray<TradeOut>): PnlPoint[] {
  const closed = trades
    .filter(
      (t) =>
        t.status !== 'OPEN' &&
        t.closed_at !== null &&
        t.type !== 'FUND' &&
        t.type !== 'WITHDRAW',
    )
    .slice()
    .sort((a, b) => Date.parse(a.closed_at!) - Date.parse(b.closed_at!));
  if (closed.length === 0) return [];

  // Bucket per day.
  const byDay = new Map<string, { pnl: number; trades: number }>();
  for (const t of closed) {
    const key = startOfDay(t.closed_at!);
    const pnl = safeNumber(t.pnl_usd);
    const bucket = byDay.get(key) ?? { pnl: 0, trades: 0 };
    bucket.pnl += pnl;
    bucket.trades += 1;
    byDay.set(key, bucket);
  }

  const out: PnlPoint[] = [];
  let cumulative = 0;
  // Sort by key ascending so the curve flows left-to-right.
  const sortedKeys = [...byDay.keys()].sort();
  for (const key of sortedKeys) {
    const bucket = byDay.get(key)!;
    cumulative += bucket.pnl;
    out.push({
      date: key,
      pnl: Math.round(cumulative * 100) / 100,
      trades: bucket.trades,
    });
  }
  return out;
}

function computeWinRate(curve: ReadonlyArray<PnlPoint>): number {
  if (curve.length === 0) return 0;
  const wins = curve.filter((p) => p.pnl > 0).length;
  return Math.round((wins / curve.length) * 1000) / 10;
}

function computeCashflow(
  trades: ReadonlyArray<TradeOut>,
  currentBalance: number,
): CashflowSummary {
  let grossProfit = 0;
  let grossLoss = 0;
  let totalDeposits = 0;
  let totalWithdrawals = 0;
  for (const t of trades) {
    // FASE 4E — FUND / WITHDRAW rows are the deposit/withdrawal
    // ledger. We pull them out separately so the user sees the real
    // capital-injected number (the dashboard CAN compute this
    // exactly when the backend writes these rows on fund/withdraw).
    if (t.type === 'FUND') {
      totalDeposits += safeNumber(t.pnl_usd);
      continue;
    }
    if (t.type === 'WITHDRAW') {
      totalWithdrawals += Math.abs(safeNumber(t.pnl_usd));
      continue;
    }
    if (t.status === 'OPEN') continue;
    const pnl = safeNumber(t.pnl_usd);
    if (pnl > 0) grossProfit += pnl;
    else if (pnl < 0) grossLoss += Math.abs(pnl);
  }
  // If the backend doesn't yet emit FUND/WITHDRAW rows (pre-migration
  // deployment) we fall back to the algebra:
  //   balance = deposits - withdrawals + grossProfit - grossLoss
  // ⇒ deposits = max(0, currentBalance + withdrawals + grossLoss - grossProfit)
  // so the number stays consistent with the user's mental model.
  if (totalDeposits === 0 && totalWithdrawals === 0 && currentBalance > 0) {
    const inferred = currentBalance + grossLoss - grossProfit;
    if (inferred > 0) totalDeposits = inferred;
  }

  return {
    balance: currentBalance,
    totalDeposits: Math.round(totalDeposits * 100) / 100,
    totalWithdrawals: Math.round(totalWithdrawals * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    grossLoss: Math.round(grossLoss * 100) / 100,
  };
}

function computeMarketDistribution(trades: ReadonlyArray<TradeOut>): MarketSlice[] {
  type Mutable = { -readonly [K in keyof MarketSlice]: MarketSlice[K] };
  const initial = (kind: MarketSlice['kind']): MarketSlice => ({
    kind,
    volume: 0,
    pnl: 0,
    trades: 0,
  });
  const map = new Map<TradeOut['type'], Mutable>();
  map.set('BINARY', initial('BINARY'));
  map.set('FOREX', initial('FOREX'));
  for (const t of trades) {
    const existing = map.get(t.type);
    if (!existing) continue;
    existing.trades += 1;
    existing.pnl += safeNumber(t.pnl_usd);
    // Volume proxy: BINARY uses investment_usd, FOREX uses lot_size.
    if (t.type === 'BINARY') {
      existing.volume += safeNumber(t.investment_usd);
    } else {
      // FOREX: 1 lot ≈ 100,000 units; multiply by entry_price to
      // approximate notional volume in USD.
      const lots = safeNumber(t.lot_size);
      const entry = safeNumber(t.entry_price);
      existing.volume += lots * entry;
    }
  }
  return [map.get('BINARY')!, map.get('FOREX')!];
}

function computeTopPairs(trades: ReadonlyArray<TradeOut>): PairStat[] {
  const map = new Map<
    string,
    {
      pair: string;
      kind: TradeOut['type'];
      trades: number;
      wins: number;
      pnl: number;
    }
  >();
  for (const t of trades) {
    if (t.type === 'FUND' || t.type === 'WITHDRAW') continue;
    const label = t.pair ?? t.instrument;
    const existing = map.get(label) ?? {
      pair: label,
      kind: t.type,
      trades: 0,
      wins: 0,
      pnl: 0,
    };
    existing.trades += 1;
    existing.pnl += safeNumber(t.pnl_usd);
    if (t.status === 'CLOSED_WIN') existing.wins += 1;
    map.set(label, existing);
  }
  const enriched = [...map.values()].map((p) => ({
    pair: p.pair,
    kind: p.kind,
    trades: p.trades,
    winRate: p.trades > 0 ? p.wins / p.trades : 0,
    pnl: Math.round(p.pnl * 100) / 100,
  }));
  enriched.sort((a, b) => b.pnl - a.pnl);
  return enriched.map((p, idx) => ({ ...p, rank: idx + 1 })).slice(0, 7);
}

/**
 * We can't pull a global strength feed from the backend. We infer a
 * "user-relative" strength per currency from how often each base
 * currency appears in the user's closed trades. It's a useful
 * relative signal ("you trade EUR/USD 3× more than GBP/JPY") even
 * though it isn't a real-world strength meter.
 */
function computeCurrencyStrength(trades: ReadonlyArray<TradeOut>): CurrencyStrength[] {
  const counts = new Map<string, number>();
  for (const t of trades) {
    const code = (t.pair ?? t.instrument).slice(0, 3).toUpperCase();
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  const codes = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'];
  const total = [...counts.values()].reduce((a, b) => a + b, 0) || 1;
  return codes.map((code) => {
    const c = counts.get(code) ?? 0;
    const strength = total > 0 ? (c / total) * 100 : 0;
    return { currency: code, strength: Math.round(strength * 10) / 10 };
  });
}

function computeMonthlyHeatmap(trades: ReadonlyArray<TradeOut>): HeatmapCell[][] {
  // Build the last 28 calendar days ending today.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const days: Date[] = [];
  for (let i = 27; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    days.push(d);
  }
  const totals = new Map<string, { pnl: number; trades: number }>();
  for (const t of trades) {
    if (t.status === 'OPEN' || t.closed_at === null) continue;
    if (t.type === 'FUND' || t.type === 'WITHDRAW') continue;
    const key = startOfDay(t.closed_at);
    const bucket = totals.get(key) ?? { pnl: 0, trades: 0 };
    bucket.pnl += safeNumber(t.pnl_usd);
    bucket.trades += 1;
    totals.set(key, bucket);
  }

  // Determine the largest absolute P&L so we can normalise the
  // intensity to [-1, 1].
  const allPnls = [...totals.values()].map((b) => Math.abs(b.pnl));
  const maxAbs = Math.max(...allPnls, 1);

  // 4 columns × 7 days. We fill columns left-to-right starting
  // from the oldest day. Each column is a week.
  const cells: HeatmapCell[] = days.map((d) => {
    const key = toDateKey(d);
    const bucket = totals.get(key) ?? { pnl: 0, trades: 0 };
    const intensity =
      bucket.trades > 0 ? Math.max(-1, Math.min(1, bucket.pnl / maxAbs)) : 0;
    return {
      intensity: Math.round(intensity * 100) / 100,
      trades: bucket.trades,
      pnl: Math.round(bucket.pnl * 100) / 100,
    };
  });
  const weeks: HeatmapCell[][] = [];
  for (let w = 0; w < 4; w += 1) {
    weeks.push(cells.slice(w * 7, (w + 1) * 7));
  }
  return weeks;
}

function computeTimeHeatmap(
  trades: ReadonlyArray<TradeOut>,
): HeatmapCell[][] {
  // 5 weekday rows × 12 hour-of-day columns (08..19).
  const days = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie'];
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  const grid: HeatmapCell[][] = days.map(() =>
    hours.map(() => ({ intensity: 0, trades: 0, pnl: 0 })),
  );
  const totals = new Map<string, { pnl: number; trades: number }>();
  for (const t of trades) {
    if (t.status === 'OPEN' || t.closed_at === null) continue;
    if (t.type === 'FUND' || t.type === 'WITHDRAW') continue;
    const d = new Date(t.closed_at);
    // Monday = 0 .. Sunday = 6. We collapse Sat/Sun into Fri so the
    // 5-row grid stays clean.
    const wd = (d.getUTCDay() + 6) % 7;
    const row = Math.min(wd, 4);
    const h = d.getUTCHours();
    const cIdx = hours.indexOf(h);
    if (cIdx < 0) continue;
    const key = `${row}-${cIdx}`;
    const bucket = totals.get(key) ?? { pnl: 0, trades: 0 };
    bucket.pnl += safeNumber(t.pnl_usd);
    bucket.trades += 1;
    totals.set(key, bucket);
  }
  const allPnls = [...totals.values()].map((b) => Math.abs(b.pnl));
  const maxAbs = Math.max(...allPnls, 1);
  for (const [key, bucket] of totals.entries()) {
    const [rowStr, cStr] = key.split('-');
    const row = Number(rowStr);
    const c = Number(cStr);
    const intensity =
      bucket.trades > 0 ? Math.max(-1, Math.min(1, bucket.pnl / maxAbs)) : 0;
    grid[row]![c] = {
      intensity: Math.round(intensity * 100) / 100,
      trades: bucket.trades,
      pnl: Math.round(bucket.pnl * 100) / 100,
    };
  }
  return grid;
}

function computeAdvanced(
  trades: ReadonlyArray<TradeOut>,
  curve: ReadonlyArray<PnlPoint>,
): AdvancedMetrics {
  let grossProfit = 0;
  let grossLoss = 0;
  let followedYes = 0;
  let followedNo = 0;
  let totalDuration = 0;
  let durationCount = 0;
  for (const t of trades) {
    // FUND / WITHDRAW rows aren't trading decisions: they don't have
    // a meaningful followed_plan flag, their P&L isn't "profit", and
    // their duration isn't "time in market". Exclude them from every
    // metric so the discipline score reflects trading behaviour only.
    if (t.type === 'FUND' || t.type === 'WITHDRAW') continue;

    const pnl = safeNumber(t.pnl_usd);
    if (pnl > 0) grossProfit += pnl;
    else if (pnl < 0) grossLoss += Math.abs(pnl);

    if (t.followed_plan === true) followedYes += 1;
    else if (t.followed_plan === false) followedNo += 1;

    if (t.status !== 'OPEN' && t.closed_at !== null) {
      const opened = Date.parse(t.opened_at);
      const closed = Date.parse(t.closed_at);
      if (Number.isFinite(opened) && Number.isFinite(closed) && closed > opened) {
        totalDuration += (closed - opened) / 1000;
        durationCount += 1;
      }
    }
  }

  const profitFactor =
    grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? 99 : 0;

  // Max drawdown on the equity curve: largest drop from any peak to
  // any subsequent trough.
  let peak = 0;
  let maxDdPct = 0;
  for (const point of curve) {
    if (point.pnl > peak) peak = point.pnl;
    if (peak > 0) {
      const dd = ((peak - point.pnl) / peak) * 100;
      if (dd > maxDdPct) maxDdPct = dd;
    }
  }

  const totalDecisions = followedYes + followedNo;
  const disciplineScore =
    totalDecisions > 0 ? Math.round((followedYes / totalDecisions) * 100) : 0;

  return {
    profitFactor,
    maxDrawdownPct: Math.round(maxDdPct * 100) / 100,
    avgTradeDurationSec:
      durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
    disciplineScore,
  };
}

/* -------------------- public hook -------------------- */

export interface DashboardFilters {
  /**
   * Account scope for the analytics. Pass:
   *   - ``null`` / ``undefined`` → aggregate across ALL active accounts.
   *   - a string id → only that account's trades feed every panel.
   *
   * Cashflow balance also follows the scope: "all" sums every active
   * account's balance, while a single id shows that account only.
   */
  readonly accountId?: string | null;
}

export function useDashboardData(filters: DashboardFilters = {}): DashboardData {
  const accountsQuery = useAccounts();
  // Memoize the accounts list so downstream memos can depend on it
  // without re-firing on every parent render.
  const accounts = useMemo(
    () => accountsQuery.data?.items ?? [],
    [accountsQuery.data],
  );
  const selectedId = filters.accountId ?? null;

  // Scope the trades query: if user picked an account we filter
  // server-side; if "all" we omit the filter and the backend returns
  // every trade the user owns (still scoped by ownership + workspace).
  const tradesQuery = useTradesAll(
    selectedId !== null ? { account_id: selectedId } : {},
  );
  const trades = tradesQuery.trades;

  // Defense-in-depth: drop trades whose account isn't in the user's
  // active list.
  const activeAccountIds = useMemo(() => {
    const ids = new Set<string>();
    for (const a of accounts) ids.add(a.id);
    return ids;
  }, [accounts]);

  const scopedTrades = useMemo(
    () => trades.filter((t) => activeAccountIds.has(t.account_id)),
    [trades, activeAccountIds],
  );

  const scopedAccounts = useMemo(() => {
    if (selectedId === null) return accounts;
    return accounts.filter((a) => a.id === selectedId);
  }, [accounts, selectedId]);

  const currentBalance = scopedAccounts.reduce(
    (acc, a) => acc + safeNumber(a.balance_usd),
    0,
  );

  // Open trade count from the same dataset so the open-only hint can
  // show the right number for the current scope.
  const openTrades = useMemo(
    () => scopedTrades.filter((t) => t.status === 'OPEN').length,
    [scopedTrades],
  );

  return useMemo<DashboardData>(() => {
    const equityCurve = computeEquityCurve(scopedTrades);
    const cashflow = computeCashflow(scopedTrades, currentBalance);
    const market = computeMarketDistribution(scopedTrades);
    const topPairs = computeTopPairs(scopedTrades);
    const currencyStrength = computeCurrencyStrength(scopedTrades);
    const monthlyHeatmap = computeMonthlyHeatmap(scopedTrades);
    const timeHeatmap = computeTimeHeatmap(scopedTrades);
    const advanced = computeAdvanced(scopedTrades, equityCurve);
    const winRate = computeWinRate(equityCurve);

    return {
      equityCurve,
      cashflow,
      market,
      topPairs,
      currencyStrength,
      monthlyHeatmap,
      timeHeatmap,
      advanced,
      winRate,
      totalTrades: scopedTrades.length,
      openTrades,
      hasAnyTrade: scopedTrades.length > 0,
    };
  }, [scopedTrades, currentBalance, openTrades]);
}

/** Static time axis labels — could come from config later. */
export const TIME_HEATMAP_HOURS: ReadonlyArray<string> = [
  '08',
  '09',
  '10',
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
];

/** Day-of-week labels for the time heatmap (Mon → Fri). */
export const TIME_HEATMAP_DAYS: ReadonlyArray<string> = [
  'Lun',
  'Mar',
  'Mie',
  'Jue',
  'Vie',
];
