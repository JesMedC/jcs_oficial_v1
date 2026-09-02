/*
 * FASE 4A — RiskSemaphore.
 *
 * Topbar widget that shows the active session's risk level
 * (green/yellow/red) sourced from ``useRiskSummary()`` (which reads
 * ``GET /trades/risk-summary`` and polls every 60s).
 *
 * The data-testid + dynamic aria-label contract is exercised by
 * ``src/components/common/__tests__/topbarWidgets.test.tsx``; the
 * visible-only-at-lg rule keeps the topbar readable on mobile.
 */
import { useRiskSummary } from '../../features/trades/hooks';

const COLOR_CLASS = {
  green: 'bg-profit shadow-[0_0_8px_rgba(53,208,127,0.6)]',
  yellow: 'bg-warning shadow-[0_0_8px_rgba(243,185,78,0.6)]',
  red: 'bg-loss shadow-[0_0_8px_rgba(255,92,92,0.6)]',
} as const;

const LABEL = {
  green: 'Riesgo bajo',
  yellow: 'Riesgo medio',
  red: 'Riesgo alto',
} as const;

export function RiskSemaphore() {
  const { data } = useRiskSummary();
  const level = data?.level ?? 'green';
  const dailyPnl = data?.daily_pnl_usd ?? '0';

  return (
    <div
      data-testid="risk-semaphore"
      aria-label={`Riesgo: ${level} (P&L hoy: $${dailyPnl})`}
      title={data?.message ?? 'Sin datos de hoy'}
      className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/20 bg-surface-el/40 backdrop-blur-sm"
    >
      <span
        className={`inline-block w-2 h-2 rounded-full ${COLOR_CLASS[level]}`}
        aria-hidden="true"
      />
      <span className="font-display uppercase tracking-wide text-[10px] text-text-secondary">
        {LABEL[level]}
      </span>
    </div>
  );
}