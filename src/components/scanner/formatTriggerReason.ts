import type { ScannerAlert } from '../../features/scanner/useScannerAlerts';

/**
 * Human-readable Spanish description of WHY the alert fired.
 *
 * Mirrors the spec's two trigger conditions:
 *   - PUT  fires when (stoch > 90 OR d > 90) AND close < EMA.
 *   - CALL fires when (stoch < 10 OR d < 10) AND close > EMA.
 */
export function formatTriggerReason(alert: ScannerAlert): string {
  if (alert.direction === 'PUT') {
    return 'Stoch > 90 · Precio < EMA 200';
  }
  if (alert.direction === 'CALL') {
    return 'Stoch < 10 · Precio > EMA 200';
  }
  return 'Disparo del scanner';
}
