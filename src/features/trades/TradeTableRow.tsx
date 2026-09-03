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
import { TradeStatusBadge } from './TradeStatusBadge';
import { TradeTypeBadge } from './TradeTypeBadge';
import type { BalancePair } from './balanceTimeline';
import type { TradeOut } from './types';

interface Props {
  readonly trade: TradeOut;
  readonly balance: BalancePair | null;
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function TradeTableRow({ trade, balance }: Props) {
  const [closing, setClosing] = useState(false);
  const isOpen = trade.status === 'OPEN';
  const isForex = trade.type === 'FOREX';
  const isFundLike = trade.type === 'FUND' || trade.type === 'WITHDRAW';

  const date = new Date(trade.opened_at).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      <tr
        data-testid={`trade-row-${trade.id}`}
        className="border-b border-primary/10 hover:bg-primary/5 transition-colors"
      >
        <td className="px-3 py-2 text-text-secondary whitespace-nowrap">{date}</td>
        <td className="px-3 py-2">
          <TradeStatusBadge status={trade.status} />
        </td>
        <td className="px-3 py-2">
          <TradeTypeBadge type={trade.type} />
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
        <td className="px-3 py-2 text-right">
          {isFundLike
            ? formatMoney(trade.pnl_usd)
            : isForex
              ? formatNumber(trade.lot_size)
              : formatMoney(trade.investment_usd)}
        </td>
        <td className={`px-3 py-2 text-right font-semibold ${pnlColor(trade.pnl_usd)}`}>
          {isOpen ? '—' : formatMoney(trade.pnl_usd)}
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
