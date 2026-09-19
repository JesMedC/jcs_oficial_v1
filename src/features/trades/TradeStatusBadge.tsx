/*
 * FASE 4A — TradeStatusBadge.
 *
 * Pill rendering for the four ``TradeStatus`` literals. The visual
 * palette lives in ``TRADE_STATUS_BADGE.className`` (see types.ts)
 * so this component is just a thin presentational shell — every
 * colour, background and border decision is owned by the badge map
 * and stays in lock-step with the payments module.
 *
 * ``data-testid`` exposes the status literal so row-level tests can
 * assert presence without depending on Spanish copy.
 *
 * Work unit (D) — ``tintClass`` prop. ``TradeTableRow`` passes a row
 * tint (``!text-loss`` / ``!text-profit``) so the whole operations
 * log row, including this badge, paints red / green when the status
 * is CLOSED_LOSS / CLOSED_WIN. The bang prefix is required because
 * Tailwind's text-utilities compile in a deterministic order where
 * ``text-profit`` is declared after ``text-loss`` — without
 * ``!important`` the badge's own ``text-loss`` / ``text-profit``
 * class (the badge already maps CLOSED_LOSS → text-loss and
 * CLOSED_WIN → text-profit) would beat a plain ``text-loss`` /
 * ``text-profit`` appended at the end. The bang makes the row tint
 * always win visually while still keeping the badge's bg pattern
 * (``bg-loss/15``, ``bg-profit/15``, ``bg-warning/15``,
 * ``bg-text-muted/15``) and the Spanish label intact — color-blind
 * users keep the text cue. Default is ``''`` so callers that don't
 * care about row tint get the existing behaviour unchanged.
 */
import { TRADE_STATUS_BADGE, type TradeStatus } from './types';

interface Props {
  readonly status: TradeStatus;
  /**
   * Optional class appended after the badge's own colour ladder.
   * TradeTableRow uses this to paint the whole CLOSED_LOSS /
   * CLOSED_WIN row red / green — see the file-level comment for
   * why the bang prefix is mandatory. Defaults to ``''`` so
   * existing callers keep working.
   */
  readonly tintClass?: string;
}

export function TradeStatusBadge({ status, tintClass = '' }: Props) {
  const meta = TRADE_STATUS_BADGE[status];
  return (
    <span
      data-testid={`trade-status-${status}`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs uppercase tracking-wide font-display ${meta.className} ${tintClass}`}
    >
      {meta.label}
    </span>
  );
}
