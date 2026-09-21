import { PricingTier } from './PricingTier';
import { PRICING_TIERS, type BillingCycle } from '../../lib/seo/jsonLd';

/*
 * p0b.1b — 3-tier pricing grid (Starter / Plus / Elite).
 * Starter is the highlighted left column (recommended for new users
 * — 7-day free trial). Plus and Elite are the upgrade tiers.
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
