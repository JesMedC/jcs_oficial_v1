/*
 * p0d.2 — Portal DashboardPage.
 *
 * FASE 4C turned this page into the institutional analytics
 * dashboard. Information is split across three tabs so the trader
 * isn't overwhelmed:
 *
 *   - Resumen    → HUD principal (cashflow, win-rate, P&L) +
 *                   curva de balance + calendario P&L mensual
 *   - Mercado    → distribución binarias/forex, top pairs,
 *                   fuerza de divisas
 *   - Disciplina → profit factor, max drawdown, score disciplina,
 *                   heatmap horarios
 *
 * FASE 4D wired every panel to real data via `useDashboardData`
 * (which derives every metric from the user's actual trades and
 * accounts). No more synthetic seeds — the numbers reflect what
 * the user actually did.
 *
 * FASE 4E added an `AccountSelector` above the tabs so the trader
 * can scope the entire dashboard to a single account or aggregate
 * across all of them. The selector lives in local state and is
 * passed into `useDashboardData({ accountId })` so every panel
 * (cashflow, equity curve, market distribution, profit factor,
 * discipline, etc.) recomputes when the scope changes. Hidden when
 * there's only one active account.
 *
 * Identity (avatar + logout) lives in SidebarFooter. Plan lives in
 * Configuración. The dashboard itself is purely analytical.
 */
import { useState } from 'react';

import { useAuth } from '../../features/auth/useAuth';
import { SeoHead } from '../../components/SeoHead';
import { Tabs } from '../../components/ui/Tabs';
import { CashflowPanel } from '../../components/dashboard/CashflowPanel';
import { WinRateGauge } from '../../components/dashboard/WinRateGauge';
import { PnLPanel } from '../../components/dashboard/PnLPanel';
import { EquityCurveChart } from '../../components/dashboard/EquityCurveChart';
import { PnLHeatmap } from '../../components/dashboard/PnLHeatmap';
import { MarketDistribution } from '../../components/dashboard/MarketDistribution';
import { TopPairsList } from '../../components/dashboard/TopPairsList';
import { CurrencyStrengthMeter } from '../../components/dashboard/CurrencyStrengthMeter';
import { ProfitFactorDisplay } from '../../components/dashboard/ProfitFactorDisplay';
import { MaxDrawdownBar } from '../../components/dashboard/MaxDrawdownBar';
import { DisciplineScore } from '../../components/dashboard/DisciplineScore';
import { TimeHeatmap } from '../../components/dashboard/TimeHeatmap';
import { AccountSelector } from '../../components/dashboard/AccountSelector';
import {
  TIME_HEATMAP_DAYS,
  TIME_HEATMAP_HOURS,
  useDashboardData,
} from '../../features/dashboard/useDashboardData';

/**
 * Mini hint shown above the analytics when the user has OPEN trades
 * but no closed history yet. P&L panels render $0 because P&L is
 * only known after close — this banner explains why.
 */
function OpenOnlyHint({ openTrades }: { readonly openTrades: number }) {
  return (
    <div
      role="status"
      data-testid="dash-open-only-hint"
      className="flex items-start gap-3 px-3 py-2 rounded-md border border-[rgba(243,185,78,0.35)] bg-[rgba(243,185,78,0.06)]"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#F3B94E"
        strokeWidth="2"
        aria-hidden="true"
        className="mt-0.5 shrink-0"
        style={{ filter: 'drop-shadow(0 0 4px #F3B94E)' }}
      >
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
      </svg>
      <span className="font-body text-xs text-text-secondary leading-snug">
        <span className="font-display uppercase tracking-wide text-[10px] text-[#F3B94E] mr-1">
          {openTrades} operacion{openTrades === 1 ? '' : 'es'} abierta{openTrades === 1 ? '' : 's'}:
        </span>
        las metricas de P&L muestran 0 hasta que cierres. La equity
        curve y los heatmaps iran apareciendo con cada cierre.
      </span>
    </div>
  );
}

function ResumenTab({ accountId }: { readonly accountId: string | null }) {
  const data = useDashboardData({ accountId });
  const { equityCurve, cashflow, monthlyHeatmap, winRate, openTrades } = data;
  const wins = equityCurve.filter((p) => p.pnl > 0).length;
  const losses = equityCurve.filter((p) => p.pnl < 0).length;
  const net = cashflow.grossProfit - cashflow.grossLoss;
  const growthPct =
    cashflow.totalDeposits > 0
      ? (net / cashflow.totalDeposits) * 100
      : 0;
  const injectionDates: string[] = [];

  return (
    <div className="space-y-4">
      {openTrades > 0 && equityCurve.length === 0 ? (
        <OpenOnlyHint openTrades={openTrades} />
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CashflowPanel data={cashflow} />
        <WinRateGauge winRate={winRate} wins={wins} losses={losses} />
        <PnLPanel
          net={net}
          grossProfit={cashflow.grossProfit}
          grossLoss={cashflow.grossLoss}
          growthPct={growthPct}
        />
      </div>
      <EquityCurveChart points={equityCurve} injectionDates={injectionDates} />
      <PnLHeatmap weeks={monthlyHeatmap} />
    </div>
  );
}

function MercadoTab({ accountId }: { readonly accountId: string | null }) {
  const { market, topPairs, currencyStrength, openTrades, equityCurve } =
    useDashboardData({ accountId });
  return (
    <div className="space-y-4">
      {openTrades > 0 && equityCurve.length === 0 ? (
        <OpenOnlyHint openTrades={openTrades} />
      ) : null}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MarketDistribution slices={market} />
        <TopPairsList pairs={topPairs} />
      </div>
      <CurrencyStrengthMeter currencies={currencyStrength} />
    </div>
  );
}

function DisciplinaTab({ accountId }: { readonly accountId: string | null }) {
  const { advanced, timeHeatmap, openTrades, equityCurve } =
    useDashboardData({ accountId });
  return (
    <div className="space-y-4">
      {openTrades > 0 && equityCurve.length === 0 ? (
        <OpenOnlyHint openTrades={openTrades} />
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ProfitFactorDisplay profitFactor={advanced.profitFactor} />
        <MaxDrawdownBar drawdownPct={advanced.maxDrawdownPct} />
        <DisciplineScore score={advanced.disciplineScore} />
      </div>
      <TimeHeatmap
        matrix={timeHeatmap}
        hours={TIME_HEATMAP_HOURS}
        days={TIME_HEATMAP_DAYS}
      />
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  // `null` = aggregate across every active account. Setting a
  // specific id scopes every panel (cashflow, equity curve, market
  // distribution, profit factor, etc.) to that single account.
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );

  return (
    <>
      <SeoHead
        title="Dashboard"
        description="Analitica institucional de tus operaciones en JadeCapitalSuite."
        canonicalPath="/portal/dashboard"
        noindex
      />
      <div className="w-full px-2 md:px-4">
        <div className="py-4">
          <span className="font-display uppercase tracking-widest text-[10px] md:text-xs text-text-muted">
            Panel principal
          </span>
          <h1 className="font-display uppercase tracking-wide text-2xl md:text-3xl mt-1">
            Hola, {user?.first_name ?? 'trader'}
          </h1>
          <p className="text-text-secondary font-body text-sm md:text-base mt-2 max-w-2xl">
            Tu centro de mando: cashflow, mercado y disciplina, todo en
            una sola vista.
          </p>
        </div>

        <div className="py-4">
          <AccountSelector
            value={selectedAccountId}
            onChange={setSelectedAccountId}
          />
        </div>

        <div className="py-4">
          <Tabs
            ariaLabel="Secciones del dashboard"
            defaultActiveKey="resumen"
            urlSyncKey="tab"
            items={[
              {
                key: 'resumen',
                label: 'Resumen',
                panel: <ResumenTab accountId={selectedAccountId} />,
              },
              {
                key: 'mercado',
                label: 'Mercado',
                panel: <MercadoTab accountId={selectedAccountId} />,
              },
              {
                key: 'disciplina',
                label: 'Disciplina',
                panel: <DisciplinaTab accountId={selectedAccountId} />,
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
