import { PricingTier } from './PricingTier';
import { PRICING_TIERS, type BillingCycle } from '../../lib/seo/jsonLd';

/*
 * p1c — 3-tier pricing grid (Starter / Pro / Elite).
 * Pro tier is the highlighted middle column.
 */
interface PricingTiersGridProps {
  readonly cycle: BillingCycle;
}

export function PricingTiersGrid({ cycle }: PricingTiersGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
      {PRICING_TIERS.map((tier) => (
        <PricingTier key={tier.id} tier={tier} cycle={cycle} />
      ))}
    </div>
  );
}
