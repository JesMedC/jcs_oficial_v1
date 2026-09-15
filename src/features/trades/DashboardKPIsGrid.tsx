/*
 * DashboardKPIsGrid — KPI block for the Dashboard.
 *
 * Two semantic rows:
 *
 *   HOY  ┌─────────┬─────────────────────┬─────────┐
 *        │ Abiertas │ P&L Diario (spark)   │ Win Rate│
 *        └─────────┴─────────────────────┴─────────┘
 *
 *   MES  ┌─────────┬─────────┬──────────────┐
 *        │Win Rate M│ R/R Medio│ P&L Acum (%) │
 *        └─────────┴─────────┴──────────────┘
 *
 * Each card has a top row (icon + label) and a bottom row (big value +
 * sub). Values are color-coded: profit (jade), loss (red), neutral
 * (muted). Designed for quick at-a-glance reading on a 13" laptop.
 *
 * Two layouts via the ``layout`` prop:
 *   - ``"horizontal"`` (default) — HOY row is a 1/3-column grid,
 *     MES row is a 2/3/5-column responsive grid; the strip sits as
 *     a wide band at the top of the dashboard.
 *   - ``"vertical"`` — every card is full-width inside its row and
 *     stacks one under the other; designed for the right rail where
 *     the cards live below the RecentActivityFeed and the column is
 *     only ~25 % wide.
 *
 * Data sources:
 *   - ``OperationsKPIsHeader`` powers the HOY row (already computes
 *     open/P&L/win rate from the same filtered trade list).
 *   - The MES row reads closed FOREX/BINARY trades from
 *     ``useTradesAll`` (same hook the calendar uses) and computes the
 *     three monthly KPIs locally:
 *     * Win Rate Mensual  = wins / settled
 *     * R/R Ratio        = avg win / avg loss (zero if no losses)
 *     * P&L Acumulado %  = same formula as the calendar backend
 *       (net_pnl / capital_base × 100)
 */
import { useMemo } from 'react';

import { useTrades } from './hooks';
import { useAccounts } from '../accounts/hooks';
import { OperationsKPIsHeader } from './OperationsKPIsHeader';
import { formatMoney } from './format';
import type { ListTradesParams } from './types';
import type { TradeOut } from './types';

type Layout = 'horizontal' | 'vertical';

interface Props {
  readonly filters?: ListTradesParams;
  /** All trades for the scope — used for the sparkline + MES KPIs. */
  readonly tradesForKpis?: ReadonlyArray<TradeOut>;
  /**
   * Card layout. ``"horizontal"`` is the wide-band strip at the
   * top of the dashboard; ``"vertical"`` stacks every card full
   * width inside the HOY/MES sections, used in the right rail
   * below the RecentActivityFeed.
   */
  readonly layout?: Layout;
}

interface MonthlyKpis {
  readonly winRatePct: number;
  readonly riskRewardRatio: number;
  readonly cumulativePnlPct: number;
  readonly capitalBaseUsd: number;
  readonly netPnlUsd: number;
}

export function DashboardKPIsGrid({
  filters = {},
  tradesForKpis = [],
  layout = 'horizontal',
}: Props) {
  // Profit factor = Σ wins / |Σ losses|. Computed across CLOSED
  // FOREX / BINARY trades in the selected scope. We pull the full
  // page of trades so the number doesn't miss old wins/losses —
  // same scope contract as the calendar's month aggregates.
  const tradesQuery = useTrades({ ...filters, limit: 500 });
  const accountsQuery = useAccounts();

  const activeAccountIds = useMemo(() => {
    const ids = new Set<string>();
    for (const acc of accountsQuery.data?.items ?? []) {
      ids.add(acc.id);
    }
    return ids;
  }, [accountsQuery.data]);

  const pf = useMemo(() => {
    const trades = (tradesQuery.data?.items ?? []).filter(
      (t) => t.status !== 'OPEN' && activeAccountIds.has(t.account_id),
    );
    let wins = 0;
    let losses = 0;
    for (const t of trades) {
      const pnl = Number(t.pnl_usd ?? 0);
      if (pnl > 0) wins += pnl;
      else if (pnl < 0) losses += Math.abs(pnl);
    }
    if (losses === 0) return wins > 0 ? Number.POSITIVE_INFINITY : 0;
    return wins / losses;
  }, [tradesQuery.data, activeAccountIds]);

  const pfDisplay = !Number.isFinite(pf)
    ? '∞'
    : pf.toFixed(2);
  const pfTone =
    pf === 0
      ? 'muted'
      : !Number.isFinite(pf) || pf >= 1.5
        ? 'profit'
        : pf >= 1
          ? 'default'
          : 'loss';

  // MES aggregates — computed from the same scope so the values stay
  // consistent with the calendar's per-month sums.
  const monthlyKpis = useMemo<MonthlyKpis>(() => {
    const closed = tradesForKpis.filter(
      (t) =>
        (t.type === 'FOREX' || t.type === 'BINARY') &&
        t.status !== 'OPEN' &&
        activeAccountIds.has(t.account_id),
    );
    if (closed.length === 0) {
      return {
        winRatePct: 0,
        riskRewardRatio: 0,
        cumulativePnlPct: 0,
        capitalBaseUsd: 0,
        netPnlUsd: 0,
      };
    }
    let wins = 0;
    let losses = 0;
    let winSum = 0;
    let lossSum = 0;
    let netPnl = 0;
    for (const t of closed) {
      const pnl = Number(t.pnl_usd ?? 0);
      netPnl += pnl;
      if (pnl > 0) {
        wins += 1;
        winSum += pnl;
      } else if (pnl < 0) {
        losses += 1;
        lossSum += Math.abs(pnl);
      }
    }
    const settled = wins + losses;
    const winRate = settled > 0 ? (wins / settled) * 100 : 0;
    const avgWin = wins > 0 ? winSum / wins : 0;
    const avgLoss = losses > 0 ? lossSum / losses : 0;
    const riskReward = avgLoss > 0 ? avgWin / avgLoss : 0;

    // Capital base = chronologically first FUND in the scope (matches
    // the backend's ``first_fund_amount`` definition). Falls back to
    // 0 if the user has never funded.
    let capitalBase = 0;
    for (const t of [...tradesForKpis].sort((a, b) =>
      a.opened_at < b.opened_at ? -1 : 1,
    )) {
      if (t.type === 'FUND') {
        capitalBase = Number(t.investment_usd ?? 0);
        break;
      }
    }
    const cumulativePnlPct = capitalBase > 0 ? (netPnl / capitalBase) * 100 : 0;

    return {
      winRatePct: winRate,
      riskRewardRatio: riskReward,
      cumulativePnlPct,
      capitalBaseUsd: capitalBase,
      netPnlUsd: netPnl,
    };
  }, [tradesForKpis, activeAccountIds]);

  return (
    <div
      data-testid="dash-kpis-section"
      className="flex flex-col gap-3"
    >
      {/* HOY row — reuses OperationsKPIsHeader which already has the
          same 3-card layout (Abiertas / P&L Diario / Win Rate Hoy). */}
      <div>
        <SectionLabel label="Hoy" sub="Sesión en curso" />
        <div className="mt-2">
          <OperationsKPIsHeader filters={filters} layout={layout} />
        </div>
      </div>

      {/* MES row — FASE 6 surfaces the THREE most useful monthly KPIs
          that match the calendar's underlying definitions (Win Rate,
          R/R, P&L Acumulado %). The placeholder "Próximamente" cards
          from the previous iteration are gone. */}
      <div>
        <SectionLabel label="Mes" sub="Agosto · en curso" />
        <div
          className={
            layout === 'vertical'
              ? 'mt-2 flex flex-col gap-2'
              : 'mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3'
          }
        >
          <Kpi
            label="Win Rate Mensual"
            value={`${monthlyKpis.winRatePct.toFixed(0)}%`}
            tone={
              monthlyKpis.winRatePct >= 50
                ? 'profit'
                : monthlyKpis.winRatePct > 0
                  ? 'loss'
                  : 'muted'
            }
            sub="Wins / cerradas"
            layout={layout}
          />
          <Kpi
            label="Risk/Reward"
            value={monthlyKpis.riskRewardRatio > 0
              ? monthlyKpis.riskRewardRatio.toFixed(2)
              : '—'}
            tone={
              monthlyKpis.riskRewardRatio >= 1.5
                ? 'profit'
                : monthlyKpis.riskRewardRatio >= 1
                  ? 'default'
                  : 'muted'
            }
            sub="Avg win / avg loss"
            layout={layout}
          />
          <Kpi
            label="P&L Acumulado"
            value={`${monthlyKpis.cumulativePnlPct >= 0 ? '+' : ''}${monthlyKpis.cumulativePnlPct.toFixed(2)}%`}
            tone={
              monthlyKpis.cumulativePnlPct > 0
                ? 'profit'
                : monthlyKpis.cumulativePnlPct < 0
                  ? 'loss'
                  : 'muted'
            }
            sub={`Σ ${formatMoney(monthlyKpis.netPnlUsd)} · base ${formatMoney(monthlyKpis.capitalBaseUsd)}`}
            layout={layout}
          />
          <Kpi
            label="Profit Factor"
            value={pfDisplay}
            tone={pfTone}
            sub="Σ wins / |Σ losses|"
            layout={layout}
          />
          <Kpi
            label="Mejor trade"
            value={(() => {
              let best = 0;
              for (const t of tradesForKpis) {
                if (t.status === 'OPEN') continue;
                const pnl = Number(t.pnl_usd ?? 0);
                if (pnl > best) best = pnl;
              }
              return best > 0 ? `+${formatMoney(best)}` : '—';
            })()}
            tone="profit"
            sub="Mayor P&L del mes"
            layout={layout}
          />
        </div>
      </div>
    </div>
  );
}

function SectionLabel({
  label,
  sub,
}: {
  readonly label: string;
  readonly sub?: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-display uppercase tracking-widest text-[10px] md:text-xs text-text-muted">
        {label}
      </span>
      {sub !== undefined ? (
        <span className="font-mono text-[10px] text-text-muted">· {sub}</span>
      ) : null}
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
  sub,
  layout = 'horizontal',
}: {
  readonly label: string;
  readonly value: string;
  readonly tone?: 'profit' | 'loss' | 'muted' | 'default';
  readonly sub?: string;
  readonly layout?: Layout;
}) {
  const toneClass =
    tone === 'profit'
      ? 'text-profit'
      : tone === 'loss'
        ? 'text-loss'
        : tone === 'muted'
          ? 'text-text-muted'
          : 'text-text-primary';
  // Vertical cards get horizontal padding + larger value to read as
  // full-width summary tiles in the right rail; horizontal cards
  // stay compact so 5 of them fit on a laptop row.
  const cardClass =
    layout === 'vertical'
      ? 'rounded-lg border border-primary/20 bg-[rgba(13,21,30,0.55)] px-4 py-3 flex items-center justify-between gap-3'
      : 'rounded-lg border border-primary/20 bg-[rgba(13,21,30,0.55)] px-3 py-2.5 flex flex-col gap-0.5';
  const labelClass =
    layout === 'vertical'
      ? 'font-display uppercase tracking-widest text-[10px] text-text-muted shrink-0'
      : 'font-display uppercase tracking-widest text-[10px] text-text-muted';
  const valueClass =
    layout === 'vertical'
      ? `font-mono text-lg font-bold tabular-nums ${toneClass} text-right shrink-0`
      : `font-mono text-xl font-bold tabular-nums ${toneClass}`;
  return (
    <div className={cardClass}>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className={labelClass}>{label}</span>
        {layout === 'vertical' && sub !== undefined ? (
          <span className="font-mono text-[10px] text-text-muted truncate">
            {sub}
          </span>
        ) : null}
      </div>
      <span className={valueClass}>{value}</span>
      {layout === 'horizontal' && sub !== undefined ? (
        <span className="font-mono text-[10px] text-text-muted">{sub}</span>
      ) : null}
    </div>
  );
}

// (Format helpers live in `./format`; consumers import them directly.)