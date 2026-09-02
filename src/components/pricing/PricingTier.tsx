import { Link } from 'react-router-dom';
import { GlassCard } from '../GlassCard';
import type { BillingCycle, PricingTierSeo } from '../../lib/seo/jsonLd';

/*
 * p0b.1b — Pricing tier card.
 *
 * STARTER is now the highlighted tier (`MAS ELEGIDO` + `PARA NUEVOS`
 * badges) because the registration-first pivot puts new users on the
 * 7-day free trial by default. Plus and Elite are the upgrade tiers
 * (paid checkout via /dashboard/upgrade).
 *
 * CTA per tier:
 *   STARTER: "Comenzar prueba" → /register
 *   PLUS:    "Elegir Plus"     → /login (signed-in users go to
 *                                /dashboard/upgrade via the CTA on the
 *                                dashboard subscription card)
 *   ELITE:   "Elegir Elite"    → /login (same flow as Plus)
 *
 * The card surfaces `price` and `period`:
 *   STARTER: "GRATIS" + "7 dias gratis"
 *   PLUS:    "$9.99 / mes"
 *   ELITE:   "$29.99 / mes"
 */
interface PricingTierProps {
  readonly tier: PricingTierSeo;
  readonly cycle: BillingCycle;
}

export function PricingTier({ tier, cycle }: PricingTierProps) {
  const priceUsd = cycle === 'monthly' ? tier.monthlyPriceUsd : tier.annualPriceUsd;
  const isFreeTrial = tier.isFreeTrial === true;
  const priceLabel = isFreeTrial ? 'GRATIS' : `$${priceUsd.toFixed(2)}`;
  const periodLabel = isFreeTrial ? tier.periodLabel : `/ ${tier.periodLabel}`;
  const billingLine = isFreeTrial
    ? 'Sin tarjeta. Cancela cuando quieras.'
    : cycle === 'annual'
      ? 'Facturado anualmente'
      : 'Facturado mensualmente';
  const featured = tier.id === 'STARTER';
  const ctaLabel =
    tier.id === 'STARTER' ? 'Comenzar prueba' : tier.id === 'PLUS' ? 'Elegir Plus' : 'Elegir Elite';
  const ctaTo = tier.id === 'STARTER' ? '/register' : '/login';

  return (
    <div className="relative h-full">
      {featured ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-primary text-bg font-display uppercase tracking-wide text-[10px] md:text-xs shadow-[0_0_16px_rgba(0,255,255,0.45)]">
          Mas elegido
        </span>
      ) : null}
      {tier.id === 'STARTER' ? (
        <span className="absolute -top-3 right-3 z-10 px-2.5 py-1 rounded-full border border-primary/60 text-primary font-display uppercase tracking-wide text-[10px] md:text-xs bg-surface-el/80 backdrop-blur-md">
          Para nuevos
        </span>
      ) : null}
      <GlassCard
        variant={featured ? 'elevated' : 'default'}
        className={[
          'h-full flex flex-col gap-4',
          featured ? 'border-primary shadow-[0_0_40px_rgba(0,255,255,0.30)]' : '',
        ].join(' ')}
      >
        <header className="flex flex-col gap-1">
          <h3 className="font-display uppercase tracking-wide text-primary text-xl md:text-2xl">
            {tier.name}
          </h3>
          <p className="text-text-secondary font-body text-sm">{tier.tagline}</p>
        </header>

        <div className="border-t border-primary/20" />

        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-text-primary text-3xl md:text-4xl">{priceLabel}</span>
          <span className="font-body text-text-secondary text-sm">{periodLabel}</span>
        </div>
        <p className="text-text-muted font-body text-xs">{billingLine}</p>

        <ul className="flex flex-col gap-2 mt-2 flex-1">
          {tier.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 text-sm font-body text-text-primary"
            >
              <Check />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <Link
          to={ctaTo}
          className={[
            'mt-4 inline-flex justify-center font-display uppercase tracking-wide px-3 py-2 rounded-lg text-sm transition-all',
            featured
              ? 'bg-primary text-bg hover:shadow-[0_0_24px_rgba(0,255,255,0.5)]'
              : 'border-2 border-primary text-primary hover:bg-primary hover:text-bg',
          ].join(' ')}
        >
          {ctaLabel}
        </Link>
      </GlassCard>
    </div>
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
