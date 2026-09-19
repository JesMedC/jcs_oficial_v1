/*
 * FASE 4A / FASE 4E — TradeTableRow.
 *
 * Single dense row in the operations log. Branches driven by
 * ``trade.type``:
 *
 *   - FOREX:     pair + lot_size + entry_price / exit_price + r-mult
 *   - BINARY:    instrument + investment_usd + payout_pct (r-mult
 *                usually null on binary because there's no stop)
 *   - FUND /     single amount column with a delta-vs-balance
 *     WITHDRAW   indicator (these are not "trades" per se, they're
 *                capital movements — the user filters them in or out
 *                via the Tipo dropdown)
 *
 * OPEN trades show ``—`` for the exit price, r-mult columns.
 *
 * The "balance" prev/post columns come from a precomputed timeline
 * (see ``balanceTimeline.ts``) so each row is a constant-time
 * lookup — we don't recompute the walk on every render.
 */
import { useState } from 'react';

import { CloseTradeModal } from './CloseTradeModal';
import { formatMoney, formatNumber, pnlColor } from './format';
import {
  SESSION_LABELS,
  sessionForTimestamp,
  type SessionBand,
} from '../sessions';
import { TradeStatusBadge } from './TradeStatusBadge';
import { TradeTypeBadge } from './TradeTypeBadge';
import type { AccountOut } from '../accounts/types';
import type { BalancePair } from './balanceTimeline';
import type { TradeOut } from './types';

/**
 * Visual palette per session. Four discrete colors (jade / cyan /
 * amber / profit) read as separate markets at a glance without
 * requiring the user to read the label. Slice B (sessions-configurable-cap)
 * renamed the legacy NYSE/LONDRES/SIDNEY trio to the four real
 * session names — colors map 1:1 per design.md §4.2.
 */
const SESSION_PILL_CLASS: Record<SessionBand, string> = {
  ASIA: 'bg-primary/15 text-primary',
  LONDON: 'bg-info/15 text-info',
  NEW_YORK: 'bg-profit/15 text-profit',
  SYDNEY: 'bg-warning/15 text-warning',
};

/**
 * Compact session pill — renders the localized session name inside
 * the canonical badge frame. Returns null for trades whose
 * ``opened_at`` falls outside every defined window so the row can
 * swap in a muted em-dash placeholder.
 */
function SessionPill({ session }: { readonly session: SessionBand }) {
  return (
    <span
      data-testid={`trade-session-${session}`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs uppercase tracking-wide font-display ${SESSION_PILL_CLASS[session]}`}
    >
      {SESSION_LABELS[session]}
    </span>
  );
}

interface Props {
  readonly trade: TradeOut;
  readonly balance: BalancePair | null;
  /**
    Account lookup keyed by id. The parent (TradeTable) builds this
    once per render and threads it in so the row can show the
    human-readable account name in its own column without making
    another ``useAccounts`` call per row.
   */
  readonly accountsById: ReadonlyMap<string, AccountOut>;
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function TradeTableRow({ trade, balance, accountsById }: Props) {
  const [closing, setClosing] = useState(false);
  const isOpen = trade.status === 'OPEN';
  const isForex = trade.type === 'FOREX';
  const isFundLike = trade.type === 'FUND' || trade.type === 'WITHDRAW';
  // Signed amount for FUND/WITHDRAW rows: positive for deposits,
  // negative for withdrawals (the backend stores ``investment_usd``
  // as a positive magnitude and puts the sign in ``type``). Used to
  // render ``+US$ X,XX`` (DEPOSITO) / ``-US$ X,XX`` (RETIRO) with
  // the same green/red tokens the P&L column uses.
  const capitalAmount = isFundLike
    ? trade.type === 'WITHDRAW'
      ? -Number(trade.investment_usd ?? 0)
      : Number(trade.investment_usd ?? 0)
    : 0;

  const date = new Date(trade.opened_at).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Derive the trading session from the trade's opened_at (UTC) so the
  // column renders on the client without any backend changes — see
  // ``src/features/sessions/index.ts`` for the rule. The shared
  // resolver collapses the legacy 3-class file (NYSE / LONDRES /
  // SIDNEY) into the four real session names per Slice B.
  const session = sessionForTimestamp(trade.opened_at);

  /**
   * Row-level tint ladder (work unit B — operations log color
   * signal). The badge already carries the Spanish label so
   * color-blind users keep the text cue; the row background adds
   * a redundant visual channel so a user scanning 25 rows can
   * spot the WIN/LOSS split without reading.
   *
   * Rules:
   *   - CLOSED_WIN   → bg-profit/10, hover bg-profit/15
   *   - CLOSED_LOSS  → bg-loss/10,   hover bg-loss/15
   *   - OPEN         → no tint (legacy hover:bg-primary/5)
   *   - CLOSED_BREAK → no tint (legacy hover:bg-primary/5)
   *   - FUND/WITHDRAW→ always neutral. Capital movements are NOT
   *     wins or losses even when the status literal says so.
   *     ``type`` wins over ``status`` here.
   *
   * Tokens come straight from ``tailwind.config.ts`` (profit/loss
   * both map to ``--color-jade-profit`` / ``--color-jade-loss``
   * defined in ``themes.css``) — no new palette is introduced.
   * The lower 10% alpha keeps the row typography readable; the
   * hover deepens to 15% to match the badge ladder
   * (``TRADE_STATUS_BADGE`` uses /15).
   */
  const tintClass = isFundLike
    ? 'hover:bg-primary/5'
    : trade.status === 'CLOSED_WIN'
      ? 'bg-profit/10 hover:bg-profit/15'
      : trade.status === 'CLOSED_LOSS'
        ? 'bg-loss/10 hover:bg-loss/15'
        : 'hover:bg-primary/5';

  return (
    <>
      <tr
        data-testid={`trade-row-${trade.id}`}
        className={`border-b border-borderJade transition-colors ${tintClass}`}
      >
        <td className="px-3 py-2 text-text-secondary whitespace-nowrap">{date}</td>
        <td className="px-3 py-2">
          <TradeStatusBadge status={trade.status} />
        </td>
        <td className="px-3 py-2">
          <TradeTypeBadge type={trade.type} />
        </td>
        <td
          className="px-3 py-2"
          data-testid={`trade-session-${trade.id}`}
        >
          {session === null ? (
            <span
              data-testid={`trade-session-none-${trade.id}`}
              className="text-text-muted font-mono"
              aria-label="Sin sesión"
            >
              —
            </span>
          ) : (
            <SessionPill session={session} />
          )}
        </td>
        <td className="px-3 py-2 text-text-primary font-display">
          {isForex ? trade.pair ?? trade.instrument : trade.instrument}
        </td>
        <td className="px-3 py-2 text-text-secondary">{trade.direction ?? '—'}</td>
        <td className="px-3 py-2 text-right">
          {isFundLike ? '—' : formatNumber(trade.entry_price)}
        </td>
        <td className="px-3 py-2 text-right">
          {isFundLike ? '—' : isOpen ? '—' : formatNumber(trade.exit_price)}
        </td>
        <td
          className={`px-3 py-2 text-right font-semibold ${
            isFundLike ? pnlColor(capitalAmount) : ''
          }`}
        >
          {isFundLike
            ? formatMoney(capitalAmount)
            : isForex
              ? formatNumber(trade.lot_size)
              : formatMoney(trade.investment_usd)}
        </td>
        <td className={`px-3 py-2 text-right font-semibold ${pnlColor(trade.pnl_usd)}`}>
          {isFundLike ? '—' : isOpen ? '—' : formatMoney(trade.pnl_usd)}
        </td>
        <td
          className="px-3 py-2 text-text-secondary font-body text-sm whitespace-nowrap"
          data-testid={`trade-account-${trade.id}`}
        >
          {accountsById.get(trade.account_id)?.name ?? '—'}
        </td>
        <td className="px-3 py-2 text-right font-mono text-text-secondary">
          {balance ? formatUsd(balance.prev) : '—'}
        </td>
        <td className="px-3 py-2 text-right font-mono text-text-primary">
          {balance ? formatUsd(balance.post) : '—'}
        </td>
        <td className="px-3 py-2 text-right">{formatNumber(trade.r_multiple)}</td>
        <td className="px-3 py-2 text-right">
          {isOpen ? (
            <button
              type="button"
              data-testid={`close-trade-${trade.id}`}
              onClick={() => setClosing(true)}
              className="text-xs text-primary hover:text-primary/80 underline font-display uppercase tracking-wide"
            >
              Cerrar
            </button>
          ) : null}
        </td>
      </tr>
      <CloseTradeModal trade={closing ? trade : null} onClose={() => setClosing(false)} />
    </>
  );
}
