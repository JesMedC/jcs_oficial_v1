/*
 * FASE 4A — TradeTypeBadge.
 *
 * Pill for the two ``TradeType`` literals (FOREX / BINARY). Sibling
 * of TradeStatusBadge; both lean on the badge-map pattern so visual
 * tweaks stay scoped to ``types.ts`` instead of the component.
 */
import { TRADE_TYPE_BADGE, type TradeType } from './types';

interface Props {
  readonly type: TradeType;
}

export function TradeTypeBadge({ type }: Props) {
  const meta = TRADE_TYPE_BADGE[type];
  return (
    <span
      data-testid={`trade-type-${type}`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs uppercase tracking-wide font-display ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}
