/*
 * DashboardSummaryStrip — four headline KPIs that live above the
 * RecentActivityFeed in the dashboard's right rail.
 *
 * Cards:
 *   ┌─────────────┬─────────────┬─────────────┬─────────────┐
 *   │ Balance      │ Operaciones │ P&L Neto     │ Win Rate    │
 *   │ Total        │             │             │             │
 *   │ $X.XX        │ N           │ ±$Y.YY      │ NN%         │
 *   │              │ (chart icon)│ +Z% sobre   │ A gan. /    │
 *   │              │             │   balance   │ B per.      │
 *   └─────────────┴─────────────┴─────────────┴─────────────┘
 *
 * On ``lg+`` they sit in a single row (``grid-cols-4``); on
 * narrower viewports they collapse to ``grid-cols-2`` so each
 * card stays readable inside the 25% right rail.
 *
 * Data sources (all client-computed from the props so the cards
 * stay in sync with whatever scope the parent picks):
 *   - ``balanceTotal``  — broker-reported USD total (sum of
 *                         account balances in scope)
 *   - ``tradesForCount``— full list of trades (open + closed)
 *                         just to count rows
 *   - ``tradesForPnl``  — same list, scanned for ``pnl_usd`` of
 *                         CLOSED trades and win/loss counts
 */
import { useMemo, type ReactNode } from 'react';

import { formatMoney, formatPct } from '../../features/trades/format';
import type { TradeOut } from '../../features/trades/types';
import { Sparkline } from '../ui/Sparkline';

interface Props {
  /** Real broker-reported USD balance for the active scope. */
  readonly balanceTotal: number;
  /** All trades in scope — used for the operations count + P&L
   *  sum + win-rate denominator. Same list the rest of the
   *  dashboard renders. */
  readonly tradesForCount?: ReadonlyArray<TradeOut>;
  /** Optional equity-curve series for the BALANCE sparkline. */
  readonly balanceSeries?: ReadonlyArray<number>;
  /** Optional equity-curve series for the P&L NETO sparkline (cumulative_net_pnl). */
  readonly pnlSeries?: ReadonlyArray<number>;
  /** Optional rolling series for the WIN RATE sparkline (per-trade win flag 1/0). */
  readonly winRateSeries?: ReadonlyArray<number>;
}

// (jarvis-ui-redesign T-14 — the old standalone SVG sparkline was
//  superseded by the reusable <Sparkline> primitive that takes the
//  real equity-curve series. Kept the export below as a fallback
//  in case a parent still passes it.)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _legacySparklineIcon() {
  // Tiny cyan-green sparkline — pure decoration so the Operaciones card
  // doesn't feel text-only next to the three numeric siblings.
  return (
    <svg
      width="38"
      height="14"
      viewBox="0 0 38 14"
      fill="none"
      aria-hidden="true"
      data-testid="summary-sparkline"
    >
      <path
        d="M1 11 L7 9 L11 11 L15 7 L20 9 L24 5 L29 7 L34 3 L37 5"
        stroke="var(--color-jade-profit)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="37" cy="5" r="1.6" fill="var(--color-jade-profit)" />
    </svg>
  );
}

export function DashboardSummaryStrip({
  balanceTotal,
  tradesForCount = [],
  balanceSeries = [],
  pnlSeries = [],
  winRateSeries = [],
}: Props) {
  // Single pass — same scan powers the operations count, the net
  // P&L and the win/loss split so they always agree.
  const stats = useMemo(() => {
    let closedCount = 0;
    let wins = 0;
    let losses = 0;
    let netPnl = 0;
    for (const t of tradesForCount) {
      if (t.status !== 'OPEN') {
        closedCount += 1;
        const pnl = Number(t.pnl_usd ?? 0);
        netPnl += pnl;
        if (pnl > 0) wins += 1;
        else if (pnl < 0) losses += 1;
        // CLOSED_BREAK (pnl = 0) deliberately EXCLUDED from both
        // wins and losses so the win-rate matches the Diario's
        // FIX-3 denominator contract.
      }
    }
    const settled = wins + losses;
    const winRate = settled > 0 ? wins / settled : null;
    const pnlPctOfBalance = balanceTotal > 0 ? (netPnl / balanceTotal) * 100 : 0;
    return {
      operations: tradesForCount.length,
      closedCount,
      wins,
      losses,
      netPnl,
      winRate,
      pnlPctOfBalance,
    };
  }, [tradesForCount, balanceTotal]);

  return (
    <div
      data-testid="dash-summary-strip"
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
    >
      <SummaryCard
        label="Balance Total"
        value={formatMoney(balanceTotal)}
        tone={balanceTotal > 0 ? 'profit' : 'muted'}
        rightAdornment={
          balanceSeries.length > 0 ? (
            <Sparkline data={balanceSeries} width={68} height={22} tone="profit" />
          ) : null
        }
        testId="summary-balance"
      />
      <SummaryCard
        label="Operaciones"
        value={String(stats.operations)}
        tone={stats.operations > 0 ? 'default' : 'muted'}
        testId="summary-operations"
      />
      <SummaryCard
        label="P&L Neto"
        value={
          stats.netPnl === 0
            ? '—'
            : `${stats.netPnl >= 0 ? '+' : ''}${formatMoney(Math.abs(stats.netPnl))}`
        }
        tone={
          stats.netPnl > 0
            ? 'profit'
            : stats.netPnl < 0
              ? 'loss'
              : 'muted'
        }
        sub={
          balanceTotal > 0
            ? `${stats.pnlPctOfBalance >= 0 ? '+' : ''}${stats.pnlPctOfBalance.toFixed(1)}% sobre balance`
            : undefined
        }
        rightAdornment={
          pnlSeries.length > 0 ? (
            <Sparkline
              data={pnlSeries}
              width={68}
              height={22}
              tone={stats.netPnl >= 0 ? 'profit' : 'loss'}
            />
          ) : null
        }
        testId="summary-pnl"
      />
      <SummaryCard
        label="Win Rate"
        value={
          stats.winRate !== null ? formatPct(stats.winRate) : '—'
        }
        tone={
          stats.winRate === null
            ? 'muted'
            : stats.winRate >= 0.5
              ? 'profit'
              : stats.winRate > 0
                ? 'loss'
                : 'muted'
        }
        sub={
          stats.wins + stats.losses > 0
            ? `${stats.wins} gan. / ${stats.losses} per.`
            : undefined
        }
        rightAdornment={
          winRateSeries.length > 0 ? (
            <Sparkline data={winRateSeries} width={68} height={22} tone="primary" />
          ) : null
        }
        testId="summary-winrate"
      />
    </div>
  );
}

interface SummaryCardProps {
  readonly label: string;
  readonly value: string;
  readonly tone: 'profit' | 'loss' | 'muted' | 'default';
  readonly sub?: string | undefined;
  readonly rightAdornment?: ReactNode;
  readonly testId: string;
}

function SummaryCard({
  label,
  value,
  tone,
  sub,
  rightAdornment,
  testId,
}: SummaryCardProps) {
  const toneClass =
    tone === 'profit'
      ? 'text-profit'
      : tone === 'loss'
        ? 'text-loss'
        : tone === 'muted'
          ? 'text-text-muted'
          : 'text-text-primary';
  return (
    <div
      data-testid={testId}
      className="rounded-xl border border-primary/20 bg-[rgba(13,21,30,0.7)] backdrop-blur-md px-3 py-3 flex flex-col gap-1 min-w-0"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display uppercase tracking-widest text-[10px] text-text-muted truncate">
          {label}
        </span>
        {rightAdornment}
      </div>
      <span
        className={`font-mono text-xl md:text-2xl font-bold tabular-nums leading-tight truncate ${toneClass}`}
      >
        {value}
      </span>
      {sub !== undefined ? (
        <span className="font-mono text-[10px] text-text-muted truncate">
          {sub}
        </span>
      ) : null}
    </div>
  );
}
