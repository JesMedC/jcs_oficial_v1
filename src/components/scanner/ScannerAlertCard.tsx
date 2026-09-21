/*
 * ScannerAlertCard — left-column card rendering one scanner alert.
 *
 * One card per alert received from the WS hook. The card hosts:
 *   - pair + expiration header (jade pair, Orbitron uppercase)
 *   - human-readable trigger reason + raw indicator readout
 *   - direction badge (PUT in red, CALL in jade)
 *   - "Cargar en Diario" CTA that opens the NewTradeDrawer pre-filled
 *     with pair + direction + 1% investment
 *
 * Visual treatment:
 *   - 2px coloured accent stripe on the LEFT edge in the alert's
 *     direction colour (PUT = red, CALL = jade). Cheap way to make a
 *     stack of alerts scannable without having to read the badge.
 *   - Header pair + expiration on the same row for compactness.
 *   - Indicator block in a subtle jade-tinted inset so the raw
 *     numbers (Stoch / EMA distance) read as data, not prose.
 *
 * The `formatTriggerReason` helper lives in a sibling non-component
 * module so Fast Refresh can treat this file as component-only.
 */
import type { ScannerAlert } from '../../features/scanner/useScannerAlerts';
import { useNewTradeDrawer } from '../../stores/useNewTradeDrawer';

import { formatTriggerReason } from './formatTriggerReason';

// Backward-compatible test/consumer export; implementation lives in the
// sibling helper module so this component file stays Fast Refresh-safe.
// eslint-disable-next-line react-refresh/only-export-components
export { formatTriggerReason } from './formatTriggerReason';

interface ScannerAlertCardProps {
  readonly alert: ScannerAlert;
}

export function ScannerAlertCard({ alert }: ScannerAlertCardProps): JSX.Element {
  const openWithPrefill = useNewTradeDrawer((s) => s.openWithPrefill);

  const handleCargarEnDiario = (): void => {
    openWithPrefill({
      pair: alert.pair,
      direction: alert.direction,
    });
  };

  const isCall = alert.direction === 'CALL';
  const directionLabel = isCall ? 'CALL' : 'PUT';
  // Direction-tinted utilities reused throughout the portal.
  const directionBadge = isCall
    ? 'bg-profit/15 border border-profit/40 text-profit'
    : 'bg-loss/15 border border-loss/40 text-loss';
  const accentBar = isCall ? 'bg-profit' : 'bg-loss';
  const accentShadow = isCall
    ? '0 0 12px rgba(0,230,118,0.35)'
    : '0 0 12px rgba(244,67,54,0.35)';

  return (
    <article
      data-testid="scanner-alert-card"
      data-direction={alert.direction}
      data-pair={alert.pair}
      className="relative rounded-xl border border-primary/20 bg-[rgba(13,21,30,0.7)] backdrop-blur-md pl-4 pr-3 py-3 flex flex-col gap-2.5 overflow-hidden"
    >
      {/* Coloured accent stripe — scannable at a glance in a
          stacked list. 2px wide, full height, soft glow. */}
      <span
        aria-hidden="true"
        className={`absolute left-0 top-0 bottom-0 w-[3px] ${accentBar}`}
        style={{ boxShadow: accentShadow }}
      />

      <header className="flex items-center justify-between gap-2">
        <span className="font-display uppercase tracking-wide text-sm text-primary">
          {alert.pair}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
          {alert.expiration_time}
        </span>
      </header>

      <p
        data-testid="scanner-alert-trigger-reason"
        className="font-body text-xs text-text-secondary"
      >
        {formatTriggerReason(alert)}
      </p>

      {/* Indicator readout — inset jade-tinted block so the raw
          numbers read as data, not body copy. */}
      <div className="rounded-md bg-[rgba(0,255,157,0.04)] border border-primary/10 px-2.5 py-1.5 flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-widest">
          <span className="text-text-muted">Stochastic</span>
          <span className="text-text-primary tabular-nums">
            {alert.indicators.stoch_value.toFixed(1)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-widest">
          <span className="text-text-muted">EMA 200 dist.</span>
          <span
            className={
              alert.indicators.price_distance_ema.startsWith('-')
                ? 'text-loss tabular-nums'
                : 'text-profit tabular-nums'
            }
          >
            {alert.indicators.price_distance_ema}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <span
          data-testid="scanner-alert-direction"
          className={`${directionBadge} rounded px-2 py-0.5 text-xs font-display uppercase tracking-wide`}
        >
          {directionLabel}
        </span>
        <button
          type="button"
          data-testid="scanner-alert-cta"
          onClick={handleCargarEnDiario}
          className="text-[11px] font-display uppercase tracking-wide px-3 py-1.5 rounded border border-primary/40 text-primary hover:bg-primary hover:text-bg transition-colors"
        >
          Cargar en Diario
        </button>
      </div>
    </article>
  );
}
