/*
 * AlertsToast — Market Analyzer Bot floating toast stack.
 *
 * Mount-once component that:
 *   1. Subscribes to the WebSocket via `useScannerAlerts`.
 *   2. Renders the most recent alerts as a stacked toast cluster in
 *      the top-right of the viewport.
 *   3. Auto-dismisses each toast after 8s (one-shot setTimeout per
 *      alert id — when a new alert arrives, we don't restart timers
 *      for older toasts that are already mid-display).
 *   4. Caps the visible stack to 3 toasts at a time. Older toasts
 *      beyond the cap drop off the cluster immediately; the hook's
 *      in-memory list still retains them so re-renders don't blink.
 *
 * Visual conventions match the rest of the dashboard:
 *   - PUT  → loss-colored border (red)
 *   - CALL → profit-colored border (jade)
 *   - pair, direction, stoch_value, price_distance_ema are shown
 *     in the body; the timestamp is rendered as a small caption.
 *
 * Re-render strategy:
 *   - On a new alert, we look up the in-memory `alerts` array, keep
 *     the first N (= 3) AND everything else for retention. We then
 *     close any toast whose auto-dismiss timer has elapsed.
 *   - The component never reaches into the hook's cap or clear()
 *     directly — the user can dismiss manually with the × button
 *     OR wait 8s for auto-dismiss.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useScannerAlerts, type ScannerAlert } from '../../features/scanner/useScannerAlerts';

const MAX_VISIBLE_TOASTS = 3;
const AUTO_DISMISS_MS = 8000;

interface ToastEntry {
  readonly alert: ScannerAlert;
  readonly id: string;
}

export function AlertsToast(): JSX.Element {
  const { alerts: incoming, clear } = useScannerAlerts();
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  // timers keyed by alert id so we can clear on manual dismiss.
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const visible = useMemo<ToastEntry[]>(() => {
    const out: ToastEntry[] = [];
    for (const alert of incoming) {
      if (dismissed.has(alertKey(alert))) continue;
      out.push({ alert, id: alertKey(alert) });
      if (out.length === MAX_VISIBLE_TOASTS) break;
    }
    return out;
  }, [incoming, dismissed]);

  // Schedule auto-dismiss timers for any alert id that just appeared
  // in the visible list and isn't already scheduled. We never
  // reschedule a timer that's already running.
  useEffect(() => {
    const timers = timersRef.current;
    for (const entry of visible) {
      if (timers.has(entry.id)) continue;
      const handle = setTimeout(() => {
        setDismissed((prev) => {
          if (prev.has(entry.id)) return prev;
          const next = new Set(prev);
          next.add(entry.id);
          return next;
        });
        timers.delete(entry.id);
      }, AUTO_DISMISS_MS);
      timers.set(entry.id, handle);
    }
    return () => {
      // No global cleanup — timers stay armed so a transient
      // re-render doesn't accidentally clear them.
    };
  }, [visible]);

  // Flush all timers on unmount so jsdom doesn't complain about
  // pending handles (and so we don't leak memory).
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const handle of timers.values()) clearTimeout(handle);
      timers.clear();
    };
  }, []);

  const dismissOne = useCallback((id: string): void => {
    const timers = timersRef.current;
    const handle = timers.get(id);
    if (handle !== undefined) {
      clearTimeout(handle);
      timers.delete(id);
    }
    setDismissed((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const dismissAll = useCallback((): void => {
    const timers = timersRef.current;
    for (const handle of timers.values()) clearTimeout(handle);
    timers.clear();
    clear();
    setDismissed(new Set());
  }, [clear]);

  if (visible.length === 0) {
    return <></>;
  }

  return (
    <div
      role="region"
      aria-label="Scanner alerts"
      data-testid="scanner-toast-stack"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      <style>{`
        @keyframes jcs-scanner-toast-in {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .jcs-scanner-toast-in {
          animation: jcs-scanner-toast-in 250ms ease-out;
        }
      `}</style>
      <div className="flex justify-end pointer-events-auto">
        <button
          type="button"
          aria-label="Dismiss all scanner alerts"
          onClick={dismissAll}
          className="text-[10px] uppercase tracking-widest font-display text-text-muted hover:text-text-primary px-2 py-1"
        >
          Limpiar
        </button>
      </div>
      {visible.map((entry) => (
        <Toast
          key={entry.id}
          alert={entry.alert}
          onDismiss={() => dismissOne(entry.id)}
        />
      ))}
    </div>
  );
}

interface ToastProps {
  readonly alert: ScannerAlert;
  readonly onDismiss: () => void;
}

function Toast({ alert, onDismiss }: ToastProps): JSX.Element {
  const borderClass =
    alert.direction === 'PUT'
      ? 'border-loss/50'
      : 'border-primary/50';
  const directionText = alert.direction === 'PUT' ? 'PUT' : 'CALL';
  const directionTextColor =
    alert.direction === 'PUT' ? 'text-loss' : 'text-primary';
  return (
    <div
      data-testid="scanner-toast"
      data-direction={alert.direction}
      role="status"
      aria-live="polite"
      className={[
        'jcs-scanner-toast-in',
        'pointer-events-auto',
        'rounded-xl',
        'border',
        'bg-[rgba(13,21,30,0.85)]',
        'backdrop-blur-[12px]',
        'shadow-glass-panel',
        'p-3',
        'flex',
        'flex-col',
        'gap-2',
        borderClass,
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={[
              'font-display',
              'uppercase',
              'tracking-widest',
              'text-xs',
              'shrink-0',
              directionTextColor,
            ].join(' ')}
          >
            {directionText}
          </span>
          <span className="font-display tracking-wide text-sm text-text-primary truncate">
            {alert.pair}
          </span>
        </div>
        <button
          type="button"
          aria-label="Dismiss alert"
          onClick={onDismiss}
          className="shrink-0 text-text-secondary hover:text-text-primary text-base leading-none"
        >
          ×
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <div className="flex flex-col">
          <span className="text-text-muted uppercase tracking-widest text-[10px]">
            Stochastic
          </span>
          <span className="font-mono text-text-primary">
            {alert.indicators.stoch_value.toFixed(1)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-text-muted uppercase tracking-widest text-[10px]">
            EMA distancia
          </span>
          <span className="font-mono text-text-primary">
            {alert.indicators.price_distance_ema}
          </span>
        </div>
      </div>
      <div className="text-[10px] uppercase tracking-widest text-text-muted font-mono">
        {alert.timestamp}
      </div>
    </div>
  );
}

function alertKey(alert: ScannerAlert): string {
  // The (pair, timestamp) tuple is unique per spec — the scanner
  // never emits two alerts with the same pair within the cooldown
  // window, and timestamps are UTC ISO-8601 with sub-second precision.
  return `${alert.pair}@${alert.timestamp}`;
}