/*
 * FASE 4A — OperationsKPIsHeader.
 *
 * Three KPI cards (open count / daily P&L / win rate) sourced from
 * the server-aggregated ``GET /trades/risk-summary`` endpoint
 * (``useRiskSummary``). Computing these client-side over the first
 * 50 trades of the day would silently under-count on busy sessions,
 * so we lean on the backend's full-window aggregation.
 *
 * Layout is a responsive 1/3-column grid. The loading state renders
 * three skeleton panels so the layout doesn't reflow once the data
 * arrives — keeps the topbar stable while the page first paints.
 *
 * ``daily_pnl_usd`` is signed by convention (Decimal → JSON string),
 * so the colour switch only needs to peek at the leading ``-``;
 * using the existing ``formatMoney`` helper keeps the locale
 * (es-AR) consistent with the rest of the trade surfaces.
 */
import { useRiskSummary } from './hooks';
import { formatMoney, formatPct } from './format';

export function OperationsKPIsHeader() {
  const { data, isLoading } = useRiskSummary();

  if (isLoading || !data) {
    return (
      <div
        data-testid="operations-kpis-loading"
        className="grid grid-cols-3 gap-3"
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-lg border border-primary/20 bg-surface/40 animate-pulse"
          />
        ))}
      </div>
    );
  }

  const pnlColor = data.daily_pnl_usd.startsWith('-') ? 'text-loss' : 'text-profit';

  return (
    <div
      data-testid="operations-kpis"
      className="grid grid-cols-1 md:grid-cols-3 gap-3"
    >
      <KpiCard
        label="Abiertas hoy"
        value={String(data.open_trades_count)}
        testId="kpi-open"
      />
      <KpiCard
        label="P&L diario"
        value={formatMoney(data.daily_pnl_usd)}
        valueClass={pnlColor}
        testId="kpi-pnl"
      />
      <KpiCard
        label="Win rate hoy"
        value={data.win_rate_today > 0 ? formatPct(data.win_rate_today) : '—'}
        testId="kpi-winrate"
      />
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  valueClass?: string;
  testId: string;
}

function KpiCard({
  label,
  value,
  valueClass = 'text-text-primary',
  testId,
}: KpiCardProps) {
  // ``valueClass`` is applied to BOTH the outer card and the value
  // span so callers can assert against the ``data-testid`` wrapper
  // (e.g. ``getByTestId('kpi-pnl')``) while the label keeps its
  // own ``text-text-secondary`` colour which overrides the cascade.
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
