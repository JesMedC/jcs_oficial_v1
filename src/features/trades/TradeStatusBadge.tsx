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
 */
import { TRADE_STATUS_BADGE, type TradeStatus } from './types';

interface Props {
  readonly status: TradeStatus;
}

export function TradeStatusBadge({ status }: Props) {
  const meta = TRADE_STATUS_BADGE[status];
  return (
    <span
      data-testid={`trade-status-${status}`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs uppercase tracking-wide font-display ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}
