/*
 * RecentActivityFeed — right-rail feed of the user's most recent
 * trades (open + closed). Shows the last N operations (default 5)
 * with asset, direction badge, lot/investment size and either the
 * realized P&L (closed) or a "Cerrar" action that opens the close
 * modal in-place (open).
 *
 * Uses flags-as-emojis for the asset (the backend doesn't ship a
 * real flag image; an emoji keeps the layout light while still
 * reading as "this is a trade on a particular country"). Real
 * production would swap this for a proper market icon library.
 *
 * Color coding: profit = jade, loss = red, neutral = muted. The
 * P&L column is right-aligned and tabular-nums so values line up
 * at a glance — same monospace stack as the rest of the dashboard.
 *
 * OPEN rows replace the P&L column with a compact "Cerrar" chip
 * that triggers ``CloseTradeModal`` for that trade. The modal is
 * mounted once at the bottom of the feed and keyed by
 * ``closingTrade`` so only one close flow is in flight at a time.
 * ``useCloseTrade`` already invalidates ``['trades']`` on success,
 * so the feed refreshes itself after the close mutation lands.
 *
 * No scroll: the feed is capped at 5 rows on purpose so it never
 * needs a max-height + overflow. If the user wants more history
 * they go to the Diario / Operaciones page.
 */
import { useState } from 'react';

import { CloseTradeModal } from '../../features/trades/CloseTradeModal';
import { formatMoney, pnlColor } from '../../features/trades/format';
import { formatHour } from '../../features/trades/formatHour';
import type { TradeOut } from '../../features/trades/types';

interface Props {
  readonly trades: ReadonlyArray<TradeOut>;
  /** Cap on how many rows to render. Defaults to 5. */
  readonly limit?: number;
}

function pairFlag(instrument: string): string {
  // Light heuristic — uppercase substring before any slash. If the
  // instrument starts with a 6-letter FX pair the first 2 chars map
  // to a country flag emoji via regional indicator pairs.
  const s = instrument.toUpperCase();
  if (s.length < 6) return '🌐';
  const a = s.charCodeAt(0) - 65 + 0x1f1e6;
  const b = s.charCodeAt(1) - 65 + 0x1f1e6;
  return String.fromCodePoint(a) + String.fromCodePoint(b);
}

function directionLabel(t: TradeOut): { label: string; cls: string } {
  const d = (t.direction ?? '').toUpperCase();
  if (d === 'CALL' || d === 'LONG' || d === 'BUY') {
    return { label: 'Compra', cls: 'text-profit' };
  }
  if (d === 'PUT' || d === 'SHORT' || d === 'SELL') {
    return { label: 'Venta', cls: 'text-loss' };
  }
  return { label: 'Trade', cls: 'text-text-muted' };
}

export function RecentActivityFeed({ trades, limit = 5 }: Props) {
  // Single shared close-modal instance: at most one trade in the
  // close flow at a time. ``closingTrade`` is the trade the modal
  // currently binds to; ``null`` hides the modal entirely (the
  // modal component also short-circuits on null — defence-in-depth).
  const [closingTrade, setClosingTrade] = useState<TradeOut | null>(null);

  // Show the most recent N across every status (OPEN included).
  // Backend returns ``opened_at`` desc already, but we re-sort
  // here so the feed stays correct even if the upstream order
  // drifts (the Diario / Operaciones page does the same).
  const rows = [...trades]
    .sort(
      (a, b) =>
        new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime(),
    )
    .slice(0, limit);

  return (
    <div
      data-testid="dash-recent-activity"
      className="rounded-xl border border-primary/20 bg-[rgba(13,21,30,0.7)] backdrop-blur-md p-5 flex flex-col gap-3 min-w-0"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-[#00E676]"
            style={{ boxShadow: '0 0 6px #00E676' }}
            aria-hidden="true"
          />
          <span className="font-display uppercase tracking-widest text-[10px] md:text-xs text-text-muted">
            Operaciones recientes
          </span>
        </div>
        <span className="font-mono text-[10px] text-text-muted">
          {rows.length}/{trades.length}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="text-text-muted font-body text-sm py-8 text-center">
          Sin operaciones todavía.
        </div>
      ) : (
        <ul
          className="flex flex-col gap-1"
          data-testid="dash-recent-activity-list"
        >
          {rows.map((t) => {
            const pnl = Number(t.pnl_usd ?? 0);
            const size = Number(t.investment_usd ?? 0);
            const dir = directionLabel(t);
            const isOpen = t.status === 'OPEN';
            // dashboard-jarvis-fidelity (Slice B, T-047) — closed
            // trades surface their CLOSE hour; open trades fall
            // back to the OPEN hour so the row always reads as
            // "when did this happen?".
            const hourIso = t.closed_at ?? t.opened_at;
            return (
              <li
                key={t.id}
                data-testid={`dash-recent-activity-row-${t.id}`}
                className="flex items-center gap-3 py-2 border-b border-primary/10 last:border-b-0"
              >
                {/*
                 * dashboard-jarvis-fidelity (Slice B, T-047,
                 * REQ-DCF-007) — pair-avatar cyan chip. The
                 * emoji flag stays inside; only the wrapper
                 * changes to the cyan-tinted circular badge.
                 */}
                <span
                  data-testid="dash-recent-activity-pair-chip"
                  className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 inline-flex items-center justify-center text-xs shrink-0"
                >
                  <span className="text-base leading-none">
                    {pairFlag(t.instrument)}
                  </span>
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-sm text-text-primary truncate">
                    {t.instrument}
                  </div>
                  <div className="font-mono text-[10px] text-text-muted flex items-center gap-2">
                    <span className={dir.cls}>▲ {dir.label}</span>
                    <span>{size.toFixed(2)} Lot</span>
                    <span data-testid="dash-recent-activity-hour" className="ml-auto tabular-nums">
                      {formatHour(hourIso)}
                    </span>
                  </div>
                </div>
                {isOpen ? (
                  <button
                    type="button"
                    data-testid={`dash-recent-close-${t.id}`}
                    onClick={() => setClosingTrade(t)}
                    className="font-display uppercase tracking-wide text-[10px] text-primary hover:text-bg border border-primary/40 hover:bg-primary px-2 py-1 rounded transition-colors"
                  >
                    Cerrar
                  </button>
                ) : (
                  <div
                    className={`font-mono text-sm font-semibold tabular-nums ${pnlColor(pnl)}`}
                  >
                    {pnl === 0
                      ? '—'
                      : pnl > 0
                        ? `+${formatMoney(pnl)}`
                        : `-${formatMoney(Math.abs(pnl))}`}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Single shared close modal — keyed off the row's "Cerrar"
          chip. The mutation inside the modal invalidates ['trades']
          so the feed re-renders automatically when the trade lands
          as CLOSED_*, dropping the close button and showing the
          realised P&L in its place. */}
      <CloseTradeModal
        trade={closingTrade}
        onClose={() => setClosingTrade(null)}
      />
    </div>
  );
}
