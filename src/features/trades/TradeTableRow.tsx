/*
 * FASE 4A — TradeTableRow.
 *
 * Single dense row in the operations log. Two render branches
 * driven by ``trade.type``:
 *
 *   - FOREX: pair + lot_size + entry_price / exit_price + r-mult.
 *   - BINARY: instrument + investment_usd + payout_pct (r-mult is
 *     usually null on binary because there's no stop to risk).
 *
 * OPEN trades show ``—`` for exit price, size-weighted P&L and
 * r-mult — those columns only make sense once the position closes.
 *
 * ``pnl_usd`` is the only column that carries color; everything else
 * is text-primary or text-secondary so the eye lands on the P&L line
 * first.
 *
 * Ola 5: an inline `Cerrar` action appears only for OPEN trades and
 * mounts the per-row ``CloseTradeModal``. The modal is scoped to the
 * row via a local `closing` flag so each row owns its own instance.
 */
import { useState } from 'react';

import { CloseTradeModal } from './CloseTradeModal';
import { formatMoney, formatNumber, pnlColor } from './format';
import { TradeStatusBadge } from './TradeStatusBadge';
import { TradeTypeBadge } from './TradeTypeBadge';
import type { TradeOut } from './types';

interface Props {
  readonly trade: TradeOut;
}

export function TradeTableRow({ trade }: Props) {
  const [closing, setClosing] = useState(false);
  const isOpen = trade.status === 'OPEN';
  const isForex = trade.type === 'FOREX';
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
        <td className="px-3 py-2 text-right">{formatNumber(trade.entry_price)}</td>
        <td className="px-3 py-2 text-right">
          {isOpen ? '—' : formatNumber(trade.exit_price)}
        </td>
        <td className="px-3 py-2 text-right">
          {isForex ? formatNumber(trade.lot_size) : formatMoney(trade.investment_usd)}
        </td>
        <td className={`px-3 py-2 text-right font-semibold ${pnlColor(trade.pnl_usd)}`}>
          {isOpen ? '—' : formatMoney(trade.pnl_usd)}
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
