/*
 * DashboardSummaryStrip — four headline KPIs that live above the
 * RecentActivityFeed in the dashboard's right rail.
 *
 * dashboard-jarvis-fidelity-v2 (REQ-DCF-JV2-005) — JARVIS HUD pass:
 *   - each card now mounts inside <HudPanel> (chamfered hex corners
 *     + glass background + cyan border) instead of a plain rounded
 *     card.
 *   - profit-toned values paint with `text-shadow-glow` so they read
 *     as "lit" HUD numbers.
 *   - numeric values animate via `useCountUp` (rAF, ease-out, 600ms)
 *     from 0 → target on mount so the dashboard "powers up" the
 *     numbers instead of just snapping to the static value.
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
 */
import { useMemo, type ReactNode } from 'react';

import { formatMoney, formatPct } from '../../features/trades/format';
import type { TradeOut } from '../../features/trades/types';
import { HudPanel } from '../ui/HudPanel';
import { useCountUp } from '../../lib/useCountUp';

interface Props {
  /** Real broker-reported USD balance for the active scope. */
  readonly balanceTotal: number;
  /** All trades in scope — used for the operations count + P&L
   *  sum + win-rate denominator. Same list the rest of the
   *  dashboard renders. */
  readonly tradesForCount?: ReadonlyArray<TradeOut>;
}

function SparklineIcon() {
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

/**
 * Headline KPI tile. Wires `useCountUp` for the numeric animation,
 * paints the JARVIS HUD chrome via <HudPanel>, and applies the cyan
 * glow on profit-toned values.
 */
interface SummaryCardProps {
  readonly label: string;
  /** Raw target for the count-up animation. The card formats this to a
   *  string at render time, so the consumer just passes the number. */
  readonly value: number;
  /** Formatter applied AFTER `useCountUp` settles on the target. */
  readonly formatValue: (n: number) => string;
  readonly tone: 'profit' | 'loss' | 'muted' | 'default';
  readonly sub?: string | undefined;
  /** Optional inline decoration rendered inside the card body,
   *  BELOW the value. Used by the Operaciones sparkline
   *  (T-042, REQ-DHF-004) so the 25% right rail doesn't clip
   *  the icon. */
  readonly adornment?: ReactNode;
  readonly testId: string;
}

function SummaryCard({
  label,
  value,
  formatValue,
  tone,
  sub,
  adornment,
  testId,
}: SummaryCardProps) {
  const toneClass =
    tone === 'profit'
      ? 'text-profit text-shadow-glow'
      : tone === 'loss'
        ? 'text-loss text-shadow-glow'
        : tone === 'muted'
          ? 'text-text-muted'
          : 'text-text-primary';
  const animatedValue = useCountUp({ target: value });
  return (
    <HudPanel
      data-testid={testId}
      className="px-3 py-3 flex flex-col gap-1 min-w-0 transition-shadow duration-200 hover:shadow-hud-glow"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display uppercase tracking-widest text-[10px] text-text-muted truncate">
          {label}
        </span>
      </div>
      <span
        className={`font-mono text-xl md:text-2xl font-bold tabular-nums leading-tight truncate ${toneClass}`}
      >
        {formatValue(animatedValue)}
      </span>
      {adornment !== undefined ? (
        <div className="mx-auto -my-1">{adornment}</div>
      ) : null}
      {sub !== undefined ? (
        <span className="font-mono text-[10px] text-text-muted truncate">
          {sub}
        </span>
      ) : null}
    </HudPanel>
  );
}

export function DashboardSummaryStrip({
  balanceTotal,
  tradesForCount = [],
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
        value={balanceTotal}
        formatValue={(n) => formatMoney(n)}
        tone={balanceTotal > 0 ? 'profit' : 'muted'}
        testId="summary-balance"
      />
      <SummaryCard
        label="Operaciones"
        value={stats.operations}
        formatValue={(n) => String(Math.round(n))}
        tone={stats.operations > 0 ? 'default' : 'muted'}
        adornment={<SparklineIcon />}
        testId="summary-operations"
      />
      <SummaryCard
        label="P&L Neto"
        value={stats.netPnl}
        formatValue={(n) =>
          n === 0 ? '—' : `${n >= 0 ? '+' : ''}${formatMoney(Math.abs(n))}`
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
        testId="summary-pnl"
      />
      <SummaryCard
        label="Win Rate"
        value={stats.winRate ?? 0}
        formatValue={(n) => (stats.winRate === null ? '—' : formatPct(n))}
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
        testId="summary-winrate"
      />
    </div>
  );
}