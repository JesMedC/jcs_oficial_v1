/*
 * FASE 4A — OperationsKPIsHeader.
 *
 * Three KPI cards (open count / daily P&L / win rate) computed
 * CLIENT-SIDE from the same filtered trades the table renders, so
 * the numbers always agree with what the user actually sees in the
 * table.
 *
 * Why local computation (and not the server-aggregated
 * ``GET /trades/risk-summary`` endpoint):
 *
 *   - The server endpoint does NOT support per-account or per-workspace
 *     filtering at the workspace-scope layer we're at. It would return
 *     numbers aggregated across the whole workspace (every account,
 *     including archived/deleted ones), so the "4 ABIERTAS" badge
 *     could show 4 trades when the user only sees 1 — confusing and
 *     wrong from the user's POV.
 *
 *   - Computing locally from the already-loaded trades guarantees
 *     consistency with the table (same filter, same scope, same
 *     numbers). The trade-off is that the KPIs reflect the *current*
 *     page of trades, not the full workspace history — but since the
 *     table also shows a page, the two stay aligned.
 *
 * Layout is selectable via the ``layout`` prop:
 *   - ``"horizontal"`` (default) — a responsive 1/3-column grid;
 *     used as the dashboard's top strip.
 *   - ``"vertical"`` — three full-width cards stacked one under
 *     the other; used in the dashboard's right rail below the
 *     RecentActivityFeed.
 *
 * The loading state renders three skeleton panels so the layout
 * doesn't reflow once the data arrives — keeps the surrounding
 * chrome stable while the page first paints.
 */
import { useMemo } from 'react';

import { useTrades } from './hooks';
import { useAccounts } from '../accounts/hooks';
import { formatMoney, formatPct } from './format';
import type { ListTradesParams } from './types';

interface Props {
  readonly filters?: ListTradesParams;
  /**
   * Card layout. ``"horizontal"`` (default) renders the three
   * cards in a 1/3-column grid for the dashboard's top strip;
   * ``"vertical"`` stacks them full-width one under the other
   * for the right rail below the RecentActivityFeed.
   */
  readonly layout?: 'horizontal' | 'vertical';
}

export function OperationsKPIsHeader({ filters = {}, layout = 'horizontal' }: Props) {
  const { data, isLoading } = useTrades(filters);
  const accountsQuery = useAccounts();

  const activeAccountIds = useMemo(() => {
    const ids = new Set<string>();
    for (const acc of accountsQuery.data?.items ?? []) {
      ids.add(acc.id);
    }
    return ids;
  }, [accountsQuery.data]);

  // Compute the three KPIs from the trades the table actually shows.
  // We additionally drop trades whose account is not in the active
  // accounts list (defense-in-depth against archived accounts slipping
  // through the backend).
  const kpis = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStartMs = today.getTime();

    let openToday = 0;
    let pnlToday = 0;
    let winsToday = 0;
    let lossesToday = 0;
    // ``closedToday`` keeps counting all closed trades (including
    // BREAK) so future "cerradas hoy" tiles that want a "total
    // closed" badge can reuse it. The win-rate denominator below
    // uses ``winsToday + lossesToday`` to deliberately EXCLUDE
    // CLOSED_BREAK — a break-even close is neither a win nor a loss.
    let closedToday = 0;

    const items = data?.items ?? [];
    for (const t of items) {
      if (!activeAccountIds.has(t.account_id)) continue;
      // FASE 4E — FUND / WITHDRAW rows are capital movements, not
      // trading outcomes; they don't count toward winrate / daily P&L.
      if (t.type === 'FUND' || t.type === 'WITHDRAW') continue;

      const openedMs = Date.parse(t.opened_at);
      const openedToday = Number.isFinite(openedMs) && openedMs >= todayStartMs;

      if (t.status === 'OPEN') {
        if (openedToday) openToday += 1;
        continue;
      }

      if (!t.closed_at) continue;
      const closedMs = Date.parse(t.closed_at);
      const closedTodayFlag =
        Number.isFinite(closedMs) && closedMs >= todayStartMs;
      if (!closedTodayFlag) continue;

      pnlToday += Number(t.pnl_usd ?? 0);
      closedToday += 1;
      if (t.status === 'CLOSED_WIN') winsToday += 1;
      else if (t.status === 'CLOSED_LOSS') lossesToday += 1;
      // CLOSED_BREAK counts toward ``closedToday`` but NOT the
      // win-rate denominator.
    }

    // FIX-3 — win-rate denominator excludes BREAK. A break-even
    // close is neither a win nor a loss; counting it would deflate
    // the ratio for break-even scalping strategies.
    const decidedToday = winsToday + lossesToday;
    const winRateToday = decidedToday > 0 ? winsToday / decidedToday : null;
    const pnlFormatted = pnlToday.toFixed(2);

    return {
      openToday,
      pnlToday: pnlFormatted,
      winRateToday,
      decidedToday,
      closedToday,
    };
  }, [data, activeAccountIds]);

  if (isLoading) {
    return (
      <div
        data-testid="operations-kpis-loading"
        className={
          layout === 'vertical'
            ? 'flex flex-col gap-2'
            : 'grid grid-cols-3 gap-3'
        }
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={
              layout === 'vertical'
                ? 'h-12 rounded-lg border border-primary/20 bg-surface/40 animate-pulse'
                : 'h-24 rounded-lg border border-primary/20 bg-surface/40 animate-pulse'
            }
          />
        ))}
      </div>
    );
  }

  const pnlColor = Number(kpis.pnlToday) < 0 ? 'text-loss' : 'text-profit';

  return (
    <div
      data-testid="operations-kpis"
      className={
        layout === 'vertical'
          ? 'flex flex-col gap-2'
          : 'grid grid-cols-1 md:grid-cols-3 gap-3'
      }
    >
      <KpiCard
        label="Abiertas hoy"
        value={String(kpis.openToday)}
        testId="kpi-open"
        layout={layout}
      />
      <KpiCard
        label="P&L diario"
        value={formatMoney(kpis.pnlToday)}
        valueClass={pnlColor}
        testId="kpi-pnl"
        layout={layout}
      />
      <KpiCard
        label="Win rate hoy"
        value={kpis.winRateToday !== null ? formatPct(kpis.winRateToday) : '—'}
        testId="kpi-winrate"
        layout={layout}
      />
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  valueClass?: string;
  testId: string;
  layout?: 'horizontal' | 'vertical';
}

function KpiCard({
  label,
  value,
  valueClass = 'text-text-primary',
  testId,
  layout = 'horizontal',
}: KpiCardProps) {
  // Vertical cards sit in a narrow right rail: label + value on
  // one row, value right-aligned, denser padding. Horizontal cards
  // keep the original stacked label-over-value layout for the top
  // strip.
  if (layout === 'vertical') {
    return (
      <div
        data-testid={testId}
        className={`rounded-lg border border-primary/20 bg-surface/40 backdrop-blur-md px-4 py-2.5 flex items-center justify-between gap-3 ${valueClass}`}
      >
        <span className="text-xs uppercase tracking-wide text-text-secondary font-display">
          {label}
        </span>
        <span
          className={`text-lg font-display font-mono tabular-nums ${valueClass}`}
        >
          {value}
        </span>
      </div>
    );
  }
  return (
    <div
      data-testid={testId}
      className={`rounded-lg border border-primary/20 bg-surface/40 backdrop-blur-md p-4 ${valueClass}`}
    >
      <div className="text-xs uppercase tracking-wide text-text-secondary font-display">
        {label}
      </div>
      <div
        className={`text-2xl font-display mt-1 font-mono ${valueClass}`}
      >
        {value}
      </div>
    </div>
  );
}
