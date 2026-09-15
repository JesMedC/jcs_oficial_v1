/*
 * ScannerAlertPanel — left-column live alert feed for the Scanner page.
 *
 * Three stacked sections inside the panel:
 *   1. **Header** — connection dot (jade pulsing when WS is up, muted
 *      gray when disconnected), label "Señales del bot", buffered
 *      alert count out of 20.
 *   2. **Bot status** — universe size, trigger thresholds, current
 *      timeframe. Static info that gives the panel visual weight
 *      when no alerts have fired yet (the empty state used to leave
 *      the column looking half-empty).
 *   3. **Alert feed** — vertical scrollable list of
 *      ``ScannerAlertCard``. When empty, shows a pulsing dot + a
 *      short hint about what triggers look like.
 *
 * max-h-[calc(100vh-12rem)] keeps the panel scrollable independently
 * of the chart on the right column; the scroll lives on the
 * FEED section, not the whole panel, so the header + bot status
 * stay pinned at the top.
 */
import { useMemo } from 'react';

import { useScannerAlerts } from '../../features/scanner/useScannerAlerts';
import { ScannerAlertCard } from './ScannerAlertCard';

export function ScannerAlertPanel(): JSX.Element {
  const { alerts, connected, clear } = useScannerAlerts();

  const lastAlertAt = useMemo<string | null>(() => {
    if (alerts.length === 0) return null;
    return alerts[0]?.timestamp ?? null;
  }, [alerts]);

  return (
    <section
      data-testid="scanner-alert-panel"
      className="rounded-xl border border-primary/20 bg-[rgba(13,21,30,0.7)] backdrop-blur-md p-4 flex flex-col gap-4 min-w-[300px] max-h-[calc(100vh-12rem)]"
    >
      {/* Header — connection + count */}
      <header
        data-testid="scanner-alert-panel-header"
        className="flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2">
          <span
            data-testid="scanner-alert-panel-dot"
            data-connected={connected ? 'true' : 'false'}
            className={`inline-block w-2 h-2 rounded-full ${
              connected ? 'bg-primary' : 'bg-text-muted'
            }`}
            style={
              connected
                ? {
                    boxShadow: '0 0 8px #00E676',
                    animation: 'jcs-scanner-dot-pulse 1.4s ease-in-out infinite',
                  }
                : { boxShadow: '0 0 4px rgba(255,255,255,0.18)' }
            }
            aria-hidden="true"
          />
          <h2 className="font-display uppercase tracking-widest text-[11px] text-text-muted">
            Señales del bot
          </h2>
        </div>
        <span
          data-testid="scanner-alert-panel-count"
          className="font-mono text-[10px] text-text-muted tabular-nums"
        >
          {alerts.length}/20
        </span>
      </header>

      {/* Bot status — static info, gives the panel visual weight
          even when no alerts are buffered. */}
      <div
        data-testid="scanner-alert-panel-status"
        className="rounded-lg border border-primary/15 bg-[rgba(0,255,157,0.03)] px-3 py-2.5 flex flex-col gap-1.5"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
            Universo
          </span>
          <span className="font-mono text-xs text-text-primary tabular-nums">15 pares</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
            Temporalidad
          </span>
          <span className="font-mono text-xs text-text-primary">5m</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
            Trigger PUT
          </span>
          <span className="font-mono text-[11px] text-loss tabular-nums">
            Stoch {'>'}90 · close{' '}
            <span className="text-text-secondary">{`<`}</span> EMA200
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
            Trigger CALL
          </span>
          <span className="font-mono text-[11px] text-profit tabular-nums">
            Stoch {'<'}10 · close{' '}
            <span className="text-text-secondary">{`>`}</span> EMA200
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
            Cooldown
          </span>
          <span className="font-mono text-xs text-text-primary">10 min / par</span>
        </div>
        {lastAlertAt !== null ? (
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-primary/10">
            <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
              Última
            </span>
            <span className="font-mono text-[11px] text-text-secondary truncate">
              {lastAlertAt.replace('T', ' ').slice(0, 19)} UTC
            </span>
          </div>
        ) : null}
      </div>

      {/* Feed — scrollable list of alert cards. When empty, shows a
          muted hint so the user knows the bot is alive. */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1 flex flex-col gap-2">
        {alerts.length === 0 ? (
          <div
            data-testid="scanner-alert-panel-empty"
            className="flex-1 flex flex-col items-center justify-center gap-3 py-6"
          >
            <span
              className="inline-block w-3 h-3 rounded-full bg-primary"
              style={{
                boxShadow: '0 0 10px #00E676',
                animation: 'jcs-scanner-dot-pulse 1.4s ease-in-out infinite',
              }}
              aria-hidden="true"
            />
            <p className="font-display uppercase tracking-widest text-[10px] text-text-muted text-center">
              Esperando señales del bot
            </p>
            <p className="font-body text-[11px] text-text-muted text-center max-w-[18rem] leading-snug">
              El scanner publica acá cuando Stochastic cruza los umbrales
              {' '}
              <span className="text-loss">{`>90 / <10`}</span> con precio
              {' '}<span className="text-text-secondary">{`±`}</span>{' '}EMA200.
            </p>
          </div>
        ) : (
          <>
            {alerts.map((a, idx) => (
              <ScannerAlertCard
                key={`${a.timestamp}-${a.pair}-${idx}`}
                alert={a}
              />
            ))}
            <button
              type="button"
              data-testid="scanner-alert-panel-clear"
              onClick={clear}
              className="self-end font-display uppercase tracking-widest text-[10px] text-text-muted hover:text-primary px-2 py-1"
            >
              Limpiar historial
            </button>
          </>
        )}
      </div>
    </section>
  );
}
