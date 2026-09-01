import { GlassCard } from '../../components/GlassCard';
import type { UpgradeTier } from '../auth/types';

/*
 * p0b.1b — UpgradeCard.
 *
 * Single tier card used on /dashboard/upgrade. Renders the tier
 * name, price, period, feature list and a single CTA that triggers
 * the parent's onSelect callback (which fires the upgrade API call
 * and redirects to the MercadoPago checkout URL).
 *
 * STARTER is intentionally not offered here — it's the default
 * (free) tier; the upgrade path is only PLUS/ELITE.
 */
interface UpgradeCardProps {
  readonly tier: UpgradeTier;
  readonly priceUsd: number;
  readonly features: ReadonlyArray<string>;
  readonly tagline: string;
  readonly loading?: boolean;
  readonly onSelect: (tier: UpgradeTier) => void;
}

const TIER_LABELS: Record<UpgradeTier, string> = {
  PLUS: 'Plus',
  ELITE: 'Elite',
};

export function UpgradeCard({
  tier,
  priceUsd,
  features,
  tagline,
  loading = false,
  onSelect,
}: UpgradeCardProps) {
  const ctaLabel = tier === 'PLUS' ? 'Elegir Plus' : 'Elegir Elite';
  return (
    <GlassCard
      variant="elevated"
      className="h-full flex flex-col gap-4 border-primary shadow-[0_0_40px_rgba(0,255,255,0.30)]"
    >
      <header className="flex flex-col gap-1">
        <h3 className="font-display uppercase tracking-wide text-primary text-xl md:text-2xl">
          {TIER_LABELS[tier]}
        </h3>
        <p className="text-text-secondary font-body text-sm">{tagline}</p>
      </header>

      <div className="border-t border-primary/20" />

      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-text-primary text-3xl md:text-4xl">
          ${priceUsd.toFixed(2)}
        </span>
        <span className="font-body text-text-secondary text-sm">/ mes</span>
      </div>
      <p className="text-text-muted font-body text-xs">
        Facturado mensualmente. Cancela cuando quieras.
      </p>

      <ul className="flex flex-col gap-2 mt-2 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm font-body text-text-primary">
            <Check />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onSelect(tier)}
        disabled={loading}
        aria-busy={loading}
        className="mt-4 inline-flex justify-center bg-primary text-bg font-display uppercase tracking-wide px-4 py-2.5 rounded-lg hover:shadow-[0_0_24px_rgba(0,255,255,0.5)] transition-shadow text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Redirigiendo...' : ctaLabel}
      </button>
    </GlassCard>
  );
}

function Check() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#00FFFF"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-primary shrink-0 mt-0.5"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
