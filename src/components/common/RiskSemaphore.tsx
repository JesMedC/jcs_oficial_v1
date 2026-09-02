/*
 * portal-fase0a-base — RiskSemaphore.
 *
 * FASE 0A placeholder that shows the risk dot (green/yellow/red) for
 * the active portal session. Reads `level` from the useRiskLevel store
 * and renders a labeled dot + the textual "Sin datos de hoy" hint
 * because no real data is wired yet (real source is the future
 * `/api/v1/trades/risk-summary` endpoint, FASE 4).
 *
 * Visible only at lg+ widths so it doesn't crowd the topbar at
 * mobile sizes.
 */
import { useRiskLevel } from '../../stores/useRiskLevel';

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
  const level = useRiskLevel((state) => state.level);

  return (
    <div
      data-testid="risk-semaphore"
      aria-label={`Riesgo: ${level}`}
      title="Sin datos de hoy"
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
