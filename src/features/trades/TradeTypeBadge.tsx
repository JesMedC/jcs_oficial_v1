/*
 * FASE 4A — TradeTypeBadge.
 *
 * Pill for the two ``TradeType`` literals (FOREX / BINARY). Sibling
 * of TradeStatusBadge; both lean on the badge-map pattern so visual
 * tweaks stay scoped to ``types.ts`` instead of the component.
 *
 * Work unit (D) — ``tintClass`` prop. ``TradeTableRow`` passes a row
 * tint (``!text-loss`` / ``!text-profit``) so the whole operations
 * log row, including this badge, paints red / green when the status
 * is CLOSED_LOSS / CLOSED_WIN. The type badge's own colour
 * (FOREX → text-primary cyan, BINARY → text-info blue, FUND →
 * text-profit green, WITHDRAW → text-warning amber) would otherwise
 * beat a plain ``text-loss`` / ``text-profit`` appended at the end
 * because Tailwind's text-utilities compile in alphabetical order
 * (info < loss < primary < profit < warning). The bang prefix makes
 * the row tint always win while keeping the badge's bg pattern and
 * the Spanish label intact. Default is ``''`` so existing callers
 * keep working.
 */
import { TRADE_TYPE_BADGE, type TradeType } from './types';

interface Props {
  readonly type: TradeType;
  /**
   * Optional class appended after the badge's own colour ladder.
   * TradeTableRow uses this to paint the whole CLOSED_LOSS /
   * CLOSED_WIN row red / green — see the file-level comment for
   * why the bang prefix is mandatory. Defaults to ``''`` so
   * existing callers keep working.
   */
  readonly tintClass?: string;
}

export function TradeTypeBadge({ type, tintClass = '' }: Props) {
  const meta = TRADE_TYPE_BADGE[type];
  return (
    <span
      data-testid={`trade-type-${type}`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs uppercase tracking-wide font-display ${meta.className} ${tintClass}`}
    >
      {meta.label}
    </span>
  );
}
