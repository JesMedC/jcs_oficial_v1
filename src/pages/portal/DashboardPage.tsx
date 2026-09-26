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
import { DashboardSummaryStrip } from '../../components/dashboard/DashboardSummaryStrip';
import { RecentActivityFeed } from '../../components/dashboard/RecentActivityFeed';
import { WinrateBySessionCard } from '../../components/dashboard/WinrateBySessionCard';
import { DotGrid } from '../../components/decor/DotGrid';
import { NeuralNetwork } from '../../components/decor/NeuralNetwork';
import { CoreInterfaceWatermark } from '../../components/dashboard/CoreInterfaceWatermark';
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
  const workspaceId = firstAccountWorkspaceId ?? authCtx?.user?.workspaces[0]?.id ?? 'ws-1'; // jarvis-ui-redesign T-12c fallback (real auth resolves this).

  // `null` = aggregate across every active account. The selector is
  // the source of truth; downstream consumers (chart, KPIs, feed) all
  // read it via the same scope filter.
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Single trade fetch — shared across the KPIs grid, equity curve
  // and recent-activity feed. Same scope contract as the calendar's
  // day-detail panel.
  const tradesAll = useTradesAll(
    selectedAccountId !== null ? { account_id: selectedAccountId } : {},
  );

  // Defense-in-depth: only keep trades whose account is in the
  // user's active accounts list. Same pattern as the calendar.
  // Fallback to the unfiltered list while accountsQuery is loading
  // so the dashboard doesn't render an empty feed during the
  // accounts bootstrap (REQQ-DASH-INIT-2 — observed locally when
  // TanStack Query revalidates accounts and the Set is momentarily
  // empty).
  const tradesScoped = useMemo(() => {
    if (!accountsQuery.data) {
      return tradesAll.trades ?? [];
    }
    const ids = new Set<string>();
    for (const a of accountsQuery.data.items) ids.add(a.id);
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
      selectedAccountId !== null ? items.filter((a) => a.id === selectedAccountId) : items;
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
      <div className="relative w-full max-w-[1440px] mx-auto px-0 sm:px-2 md:px-4">
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
            {/*
             * dashboard-jarvis-fidelity (Slice A, T-038, REQ-DCF-002) —
             * dashboard-only density bump: spacing 24 → 20 (denser
             * dots) and opacity 0.04 → 0.05 (slightly brighter).
             * Other surfaces keep the default decor density.
             */}
            <DotGrid spacing={20} opacity={0.05} />
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
        {/* ---- Header (jarvis-ui-redesign T-12) ----
         *
         * Hero row of the dashboard: brand sub-label "MAIN PANEL" +
         * oversized uppercase H1 "HOLA, JESUS" with a strong cyan
         * glow halo (--jarvis-h1-glow) + sub-line subtitle. The CTA
         * is now a HudButton (T-08) for the outlined JARVIS look.
         */}
        <section
          data-portal-panel
          className="relative overflow-hidden rounded-2xl p-4 sm:p-5 lg:p-6 mb-4"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <span
                data-testid="dash-hero-label"
                data-portal-kicker
                className="text-[10px] md:text-xs"
              >
                MAIN PANEL
              </span>
              <h1 className="font-display uppercase tracking-wide text-2xl md:text-4xl mt-2 text-text-primary">
                Hola, {user?.first_name ?? 'trader'}
              </h1>
              <p className="text-text-secondary font-body text-sm md:text-base mt-2 max-w-2xl leading-relaxed">
                Tu centro de mando: cashflow, mercado y disciplina, todo en una sola vista.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-start sm:justify-end">
              <AccountSelector value={selectedAccountId} onChange={setSelectedAccountId} />
              <button
                type="button"
                data-testid="dash-new-trade"
                onClick={openDrawer}
                className="px-3 py-2 rounded-lg border border-primary text-primary bg-transparent font-display uppercase tracking-wide text-xs hover:bg-primary/10 hover:shadow-glow-cyan transition-colors shadow-[0_0_18px_rgba(0,212,216,0.16)]"
              >
                + Nuevo trade
              </button>
            </div>
          </div>
        </section>

        {/* ---- 6-metric winrate (general + 4 sessions) — REQ-WRS-007 ----
         *
         * Full-width band sitting BEFORE the chart + activity-feed split
         * so the user sees the per-session winrate as a high-level
         * summary before diving into the curves and recent trades.
         */}
        {workspaceId !== '' && (
          <div className="py-2" data-testid="dash-winrate-section">
            {/* DVC-03 — the card is now CONTROLLED by the header
               ``AccountSelector`` above so the band tiles always
               read the same scope as the parent summary strip.
               ``initialAccountId`` is set once at mount for the
               CuentasDetailPage path (which has no parent
               selector); passing `accountId` + `onAccountIdChange`
               here lifts the card into the parent-owned filter. */}
            <WinrateBySessionCard
              workspaceId={workspaceId}
              accountId={selectedAccountId}
              onAccountIdChange={setSelectedAccountId}
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
                balanceSeries={equityCurve.points.map((p) => p.account_balance)}
                pnlSeries={equityCurve.points.map((p) => p.cumulative_net_pnl)}
                winRateSeries={tradesScoped
                  .map((t) => {
                    const pnl = Number(
                      (t as unknown as { pnl?: number }).pnl ??
                        (t as unknown as { pnl_usd?: number }).pnl_usd ??
                        0,
                    );
                    return pnl > 0 ? 1 : 0;
                  })
                  .slice(-12)}
              />
            </div>

            <div className="py-4 grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(320px,1fr)] gap-4 lg:gap-5">
              <div className="min-w-0 flex flex-col gap-4" data-testid="dash-equity-curve-section">
                {/* Equity curve placeholder — restored in upcoming slice
                    (the lightweight-charts component pair was removed
                    with the scanner-merge cleanup). The hook
                    (``useEquityCurve``) is preserved so the data path
                    stays intact when the charts return. */}
                <div
                  data-testid="dash-equity-curve-placeholder"
                  className="rounded-2xl border border-[var(--portal-border)] bg-[var(--portal-surface)] p-5 sm:p-6 text-sm text-text-secondary shadow-[var(--portal-shadow)] backdrop-blur-xl"
                >
                  <span data-portal-kicker className="block text-[10px] mb-3">
                    Performance overview
                  </span>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="font-display uppercase tracking-[0.18em] text-text-primary text-base md:text-lg">
                        Equity curve
                      </p>
                      <p className="mt-1 text-text-secondary">
                        {equityCurve.points.length} days tracked
                        {scopeLabel ? ` · ${scopeLabel}` : ''}
                      </p>
                    </div>
                    {totalBalance > 0 ? (
                      <p className="font-mono text-primary text-lg md:text-2xl">
                        {formatUsd(totalBalance)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
              <aside className="min-w-0 flex flex-col gap-4 xl:sticky xl:top-24 xl:self-start">
                <RecentActivityFeed trades={tradesScoped} />
                <DashboardKPIsGrid
                  filters={selectedAccountId !== null ? { account_id: selectedAccountId } : {}}
                  tradesForKpis={tradesScoped}
                  layout="vertical"
                />
              </aside>
            </div>
          </>
        )}
      </div>
    </>
  );
}
