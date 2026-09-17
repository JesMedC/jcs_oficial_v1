/*
 * Portal DashboardPage — analytic welcome surface.
 *
 * FASE 6 — Diario redesign final layout (75/25 split):
 *
 *   ┌─ Header (greeting + selector + new trade CTA) ─────────────┐
 *   ├─ 6-metric winrate by session (full-width) ──────────────────┤
 *   ├─ 75% chart panel ─── 25% right rail ────────────────────────┐
 *   │  PerformanceCurveChart   RecentActivityFeed (last 5 ops)  │
 *   │  (jade area + volume bars)                                  │
 *   │  CapitalCurveChart       KPI block (HOY + MES, stacked)   │
 *   │  (cyan dashed balance line)                                 │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Hook wiring:
 *   - ``useTradesAll`` is called once with the active scope and the
 *     same list is threaded into:
 *     * ``DashboardKPIsGrid`` for the HOY + MES KPI block (now
 *       in the right rail, stacked vertically via ``layout="vertical"``)
 *     * ``RecentActivityFeed`` for the right-rail trades (now with
 *       a "Cerrar" chip for OPEN rows)
 *     * ``useEquityCurve`` for the operations-only + volume series
 *       that feed both Performance and Capital curve charts
 *   - The same ``points`` array is fed into BOTH
 *     ``PerformanceCurveChart`` and ``CapitalCurveChart`` so the
 *     X axis stays aligned and a flat performance + rising capital
 *     reads as "skill stayed flat, capital went in".
 *   - Account selector drives scope for trades + workspace pick.
 */
import { useContext, useMemo, useState } from 'react';

import { useAuth } from '../../features/auth/useAuth';
import { SeoHead } from '../../components/SeoHead';
import { AccountSelector } from '../../components/dashboard/AccountSelector';
import { CapitalCurveChart } from '../../components/dashboard/CapitalCurveChart';
import { DashboardSummaryStrip } from '../../components/dashboard/DashboardSummaryStrip';
import { PerformanceCurveChart } from '../../components/dashboard/PerformanceCurveChart';
import { RecentActivityFeed } from '../../components/dashboard/RecentActivityFeed';
import { WinrateBySessionCard } from '../../components/dashboard/WinrateBySessionCard';
import { DotGrid } from '../../components/decor/DotGrid';
import { NeuralNetwork } from '../../components/decor/NeuralNetwork';
import { CoreInterfaceWatermark } from '../../components/dashboard/CoreInterfaceWatermark';
import { AlertsToast } from '../../components/scanner/AlertsToast';
import { DashboardKPIsGrid } from '../../features/trades/DashboardKPIsGrid';
import { useEquityCurve } from '../../features/dashboard/useEquityCurve';
import { useAccounts } from '../../features/accounts/hooks';
import { useTradesAll } from '../../features/trades/useTradesAll';
import { useNewTradeDrawer } from '../../stores/useNewTradeDrawer';
import { AuthContext } from '../../features/auth/AuthProvider';

export function DashboardPage() {
  const { user } = useAuth();
  const authCtx = useContext(AuthContext);
  const accountsQuery = useAccounts();
  const openDrawer = useNewTradeDrawer((s) => s.open);

  // Workspace id resolution — pick the first active account's
  // workspace. Falls back to the auth context's first workspace if
  // no accounts have loaded yet.
  const firstAccountWorkspaceId = accountsQuery.data?.items[0]?.workspace_id;
  const workspaceId =
    firstAccountWorkspaceId ?? authCtx?.user?.workspaces[0]?.id ?? '';

  // `null` = aggregate across every active account. The selector is
  // the source of truth; downstream consumers (chart, KPIs, feed) all
  // read it via the same scope filter.
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );

  // Single trade fetch — shared across the KPIs grid, equity curve
  // and recent-activity feed. Same scope contract as the calendar's
  // day-detail panel.
  const tradesAll = useTradesAll(
    selectedAccountId !== null ? { account_id: selectedAccountId } : {},
  );

  // Defense-in-depth: only keep trades whose account is in the
  // user's active accounts list. Same pattern as the calendar.
  const tradesScoped = useMemo(() => {
    const ids = new Set<string>();
    for (const a of accountsQuery.data?.items ?? []) ids.add(a.id);
    return (tradesAll.trades ?? []).filter((t) => ids.has(t.account_id));
  }, [tradesAll.trades, accountsQuery.data]);

  // Aggregate balance across the active scope — feeds the chart
  // subtitle "Capital agregado: $X" AND anchors the capital curve's
  // last point so it lands on the user's real balance regardless of
  // any calendar pnl_pct drift. When the selector pins a single
  // account, the balance is scoped to that account so the chart and
  // the subtitle never disagree about which money they're tracking.
  const totalBalance = useMemo(() => {
    const items = accountsQuery.data?.items ?? [];
    const scoped =
      selectedAccountId !== null
        ? items.filter((a) => a.id === selectedAccountId)
        : items;
    return scoped.reduce((acc, a) => acc + Number(a.balance_usd ?? 0), 0);
  }, [accountsQuery.data, selectedAccountId]);

  const equityCurve = useEquityCurve({
    workspaceId,
    tradesForDayPanel: tradesScoped,
    accountId: selectedAccountId,
    days: 15,
    // Anchor the capital curve's last point to the real broker
    // balance so the chart ends exactly at the user's current
    // figure (no more spurious "spike" on the last day caused by
    // the ``day_start × (1 + pnl_pct)`` approximation drifting
    // when FUND/WITHDRAW happen mid-window).
    currentBalance: totalBalance,
  });

  const scopeLabel = (() => {
    if (!selectedAccountId) return null;
    const a = accountsQuery.data?.items.find((x) => x.id === selectedAccountId);
    return a ? `${a.name} · ${a.type} · ${a.balance_usd}` : null;
  })();

  const formatUsd = (n: number): string =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(n);

  return (
    <>
      <SeoHead
        title="Dashboard"
        description="Analitica institucional de tus operaciones en JadeCapitalSuite."
        canonicalPath="/portal/dashboard"
        noindex
      />
      {/* Market Analyzer Bot — live alert toast stack. Mounted once
          near the top of the rendered tree so the floating layer
          sits above every other dashboard surface (z-50 in
          AlertsToast). The hook subscribes to /api/v1/scanner/ws
          and the component renders the most recent alerts as
          toasts that auto-dismiss after 8s. */}
      <AlertsToast />
      <div className="relative w-full px-2 md:px-4">
            {/* core-interface-redesign (Slice 2, T-030) — JARVIS HUD decor.
             *
             * Mounted as absolute-positioned background layers behind
             * the dashboard content. Per `decorative-system` spec delta
             * REQ-DEC-006: DotGrid at <= 6% opacity, NeuralNetwork at
             * <= 8% opacity so the data (cards, charts) remains the
             * focus. Both primitives read CSS vars so they auto-paint
             * cyan per Slice 1's token pivot. Decor is restricted to
             * the dashboard chrome — financial tables and the recent
             * ops rail are NEVER under decor per REQ-DEC-007. */}
            <div
              aria-hidden="true"
              data-testid="dash-decor-layer"
              className="pointer-events-none absolute inset-0 overflow-hidden"
            >
              <div className="absolute inset-0 opacity-[0.06]">
                <DotGrid />
              </div>
              <div className="absolute inset-0 opacity-[0.08]">
                <NeuralNetwork />
              </div>
              {/*
               * dashboard-jarvis-fidelity (Slice A, T-033) —
               * JARVIS chrome watermark mounts inside the existing
               * chrome layer. z-0 inside the component keeps it above
               * the decor (-z-10) but below content (z-10+ from the
               * dashboard container). Pointer-events-none keeps it
               * non-interactive.
               */}
              <CoreInterfaceWatermark />
            </div>
        {/* ---- Header ---- */}
        <div className="flex items-start justify-between gap-4 flex-wrap py-4">
          <div>
            <span className="font-display uppercase tracking-widest text-[10px] md:text-xs text-text-muted">
              Panel principal
            </span>
            <h1
              className="font-display uppercase tracking-wide text-2xl md:text-3xl mt-1"
              style={{ textShadow: '0 0 20px rgba(0,212,216,0.35)' }}
            >
              Hola, {user?.first_name ?? 'trader'}
            </h1>
            <p className="text-text-secondary font-body text-sm md:text-base mt-2 max-w-2xl">
              Tu centro de mando: cashflow, mercado y disciplina, todo en
              una sola vista.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <AccountSelector
              value={selectedAccountId}
              onChange={setSelectedAccountId}
            />
            <button
              type="button"
              data-testid="dash-new-trade"
              onClick={openDrawer}
              className="px-3 py-1.5 rounded-md border border-primary text-primary bg-transparent font-display uppercase tracking-wide text-xs hover:bg-primary/10 hover:shadow-glow-cyan transition-colors"
            >
              + Nuevo trade
            </button>
          </div>
        </div>

        {/* ---- 6-metric winrate (general + 4 sessions) — REQ-WRS-007 ----
         *
         * Full-width band sitting BEFORE the chart + activity-feed split
         * so the user sees the per-session winrate as a high-level
         * summary before diving into the curves and recent trades.
         */}
        {workspaceId !== '' && (
          <div className="py-2" data-testid="dash-winrate-section">
            <WinrateBySessionCard
              workspaceId={workspaceId}
              initialAccountId={selectedAccountId}
              availableAccounts={(accountsQuery.data?.items ?? []).map((a) => ({
                id: a.id,
                name: a.name,
              }))}
            />
          </div>
        )}

        {/* ---- 75/25 split: performance + capital curves on the left,
              RecentActivityFeed + stacked KPI block on the right ----
         *
         * The two charts STACK inside the 75% column so the eye
         * reads them as a pair: PerformanceCurveChart (jade area +
         * deposit/withdraw histogram) on top, CapitalCurveChart
         * (cyan dashed balance line) below. The right rail keeps
         * the RecentActivityFeed on top and stacks the HOY + MES
         * KPI cards one under the other below it (vertical layout —
         * the narrow column doesn't have room for the horizontal
         * 3-up strip).
         */}
        {workspaceId !== '' && (
          <>
            {/* Headline KPIs sit as a full-width band RIGHT BELOW
                the WinrateBySessionCard so the four summary cards
                (Balance Total / Operaciones / P&L Neto / Win Rate)
                have room to breathe across the full viewport,
                not just the 25% right rail. */}
            <div className="py-2" data-testid="dash-summary-section">
              <DashboardSummaryStrip
                balanceTotal={totalBalance}
                tradesForCount={tradesScoped}
              />
            </div>

            <div className="py-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div
                className="lg:col-span-3 min-w-0 flex flex-col gap-4"
                data-testid="dash-equity-curve-section"
              >
                <PerformanceCurveChart
                  points={equityCurve.points.map((p) => ({
                    date: p.date,
                    account_balance: p.account_balance,
                    cumulative_net_pnl: p.cumulative_net_pnl,
                    daily_pnl: p.daily_pnl,
                    capital_volume: p.capital_volume,
                    trades: p.trades,
                  }))}
                  scopeLabel={scopeLabel}
                />
                <CapitalCurveChart
                  points={equityCurve.points.map((p) => ({
                    date: p.date,
                    account_balance: p.account_balance,
                    cumulative_net_pnl: p.cumulative_net_pnl,
                    daily_pnl: p.daily_pnl,
                    capital_volume: p.capital_volume,
                    trades: p.trades,
                  }))}
                  scopeLabel={scopeLabel}
                  headerSubtitle={
                    totalBalance > 0
                      ? `Capital agregado: ${formatUsd(totalBalance)}`
                      : undefined
                  }
                />
              </div>
              <div className="lg:col-span-1 min-w-0 flex flex-col gap-4">
                <RecentActivityFeed trades={tradesScoped} />
                <DashboardKPIsGrid
                  filters={
                    selectedAccountId !== null
                      ? { account_id: selectedAccountId }
                      : {}
                  }
                  tradesForKpis={tradesScoped}
                  layout="vertical"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}