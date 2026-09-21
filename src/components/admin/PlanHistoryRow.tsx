/*
 * p0b.2 — PlanHistoryRow.
 *
 * One row of the deactivated-price history table on the admin plans
 * page. Renders tier + price + effective window dates.
 */
import { TIER_LABELS, type PlanTierPrice } from '../../features/admin/types';

interface PlanHistoryRowProps {
  readonly plan: PlanTierPrice;
}

function formatDate(raw: string): string {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function PlanHistoryRow({ plan }: PlanHistoryRowProps) {
  return (
    <tr className="border-t border-primary/10">
      <td className="px-4 py-3 font-display uppercase tracking-wide text-primary text-xs">
        {TIER_LABELS[plan.tier]}
      </td>
      <td className="px-4 py-3 font-mono text-text-primary">${plan.price_usd}</td>
      <td className="px-4 py-3 text-text-secondary font-body text-sm">
        {formatDate(plan.effective_from)}
      </td>
      <td className="px-4 py-3 text-text-secondary font-body text-sm">
        {plan.effective_until === null ? '—' : formatDate(plan.effective_until)}
      </td>
    </tr>
  );
}
