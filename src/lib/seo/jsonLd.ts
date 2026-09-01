/*
 * p0b.1b — basic JSON-LD Offer builder for the 3 Starter/Plus/Elite tiers.
 *
 * Pricing structure (per mem #77, p0b.1b):
 *   STARTER: $0 (7-day free trial — not a paid tier; on /pricing it's
 *            presented as "GRATIS" / "7 dias gratis")
 *   PLUS:    $9.99 / mes
 *   ELITE:   $29.99 / mes
 *
 * p0c adds the real MercadoPago integration and may swap the "free
 * trial" offer for an upgrade-promo Offer.
 *
 * Full Zod-strict builders (Organization, SoftwareApplication, Offer with
 * `inLanguage: 'es'`, validate-jsonld.mjs build-time check) land in p1f.
 * This file is intentionally minimal: it produces schema.org valid Offer
 * JSON-LD with `name` in English and `inLanguage: 'es'` per mem #68.
 */

import type { JsonLdNode } from '../../components/JsonLd';

export type BillingCycle = 'monthly' | 'annual';

export interface PricingTierSeo {
  readonly id: 'STARTER' | 'PLUS' | 'ELITE';
  readonly name: string;
  readonly tagline: string;
  readonly monthlyPriceUsd: number;
  readonly annualPriceUsd: number;
  readonly periodLabel: string;
  readonly features: ReadonlyArray<string>;
  readonly isFreeTrial?: boolean;
}

/*
 * English canonical copy for Schema.org JSON-LD Offer `name` and `description`.
 * Schema.org validators expect a single canonical identifier; Spanish copy
 * stays for the UI rendering layer (UI uses `tagline` + `features` which are
 * Spanish per mem #68; schema.org uses these English canonicals).
 */
const STARTER_EN = {
  tagline: 'For traders getting started.',
  features: ['1 account', 'Unlimited trade logging', 'Basic reports', 'Email support'],
  description: 'Plan Starter con 7 dias de prueba',
};

/*
 * Type helper so `canonicalEnCopy` returns a union that includes
 * the optional `description` field — STARTER carries it (used as
 * the Offer `description` for the free trial); Plus/Elite build
 * their description on the fly from tagline + features.
 */
type CanonicalEnCopy = {
  readonly tagline: string;
  readonly features: ReadonlyArray<string>;
  readonly description?: string;
};
const PLUS_EN = {
  tagline: 'For traders who want to grow.',
  features: [
    'Up to 5 accounts',
    'Advanced metrics and filters',
    'Custom reports',
    'CSV data export',
    'Priority support',
  ],
};
const ELITE_EN = {
  tagline: 'For demanding traders.',
  features: [
    'Unlimited accounts',
    'Advanced performance analytics',
    'Strategy backtesting',
    'Custom alerts and goals',
    'VIP support',
  ],
};

/*
 * p0b.1b — `monthlyPriceUsd`/`annualPriceUsd` use the same numbers
 * because the backend PlanTierPrice table only seeds monthly prices
 * for now. Annual billing is accepted by the schema but lands with a
 * real discount once the annual MercadoPago plan is wired in p0c.
 */
export const PRICING_TIERS: ReadonlyArray<PricingTierSeo> = [
  {
    id: 'STARTER',
    name: 'Starter',
    tagline: 'Para traders que comienzan.',
    monthlyPriceUsd: 0,
    annualPriceUsd: 0,
    periodLabel: '7 dias gratis',
    isFreeTrial: true,
    features: [
      '1 cuenta',
      'Registro ilimitado de operaciones',
      'Reportes basicos',
      'Soporte por email',
      '7 dias gratis',
    ],
  },
  {
    id: 'PLUS',
    name: 'Plus',
    tagline: 'Para traders que quieren crecer.',
    monthlyPriceUsd: 9.99,
    annualPriceUsd: 9.99,
    periodLabel: 'mes',
    features: [
      'Hasta 5 cuentas',
      'Metricas avanzadas y filtros',
      'Reportes personalizados',
      'Exportacion de datos (CSV)',
      'Soporte prioritario',
    ],
  },
  {
    id: 'ELITE',
    name: 'Elite',
    tagline: 'Para traders exigentes.',
    monthlyPriceUsd: 29.99,
    annualPriceUsd: 29.99,
    periodLabel: 'mes',
    features: [
      'Cuentas ilimitadas',
      'Analisis avanzado de rendimiento',
      'Backtesting de estrategias',
      'Alertas y objetivos personalizados',
      'Soporte VIP',
    ],
  },
];

/**
 * English-only canonical copy for the schema.org Offer `description` field.
 * Each tier id maps to the English tagline + features that Schema.org uses
 * for global SEO discoverability; UI copy remains Spanish (PRICING_TIERS above).
 */
function canonicalEnCopy(id: PricingTierSeo['id']): CanonicalEnCopy {
  if (id === 'STARTER') return STARTER_EN;
  if (id === 'PLUS') return PLUS_EN;
  return ELITE_EN;
}

/**
 * Build a schema.org Offer JSON-LD object for a single pricing tier.
 *
 * `name` and `description` use English copy because schema.org validators
 * require a single canonical identifier; `inLanguage: 'es'` signals that
 * the offering is presented in Spanish on the page (per mem #68).
 *
 * p0b.1b: STARTER is a free trial — `price` is `0` and the description
 * advertises the 7-day trial explicitly. Plus/Elite are paid offers
 * with the same monthly / annual cycle as before.
 */
export function buildOffer(tier: PricingTierSeo, cycle: BillingCycle): JsonLdNode {
  const priceUsd = cycle === 'monthly' ? tier.monthlyPriceUsd : tier.annualPriceUsd;
  const canonical = canonicalEnCopy(tier.id);

  if (tier.id === 'STARTER') {
    return {
      '@context': 'https://schema.org',
      '@type': 'Offer',
      name: 'Starter plan',
      description: canonical.description ?? 'Starter plan with 7-day free trial',
      inLanguage: 'es',
      price: '0.00',
      priceCurrency: 'USD',
      category: 'Trading journal subscription',
      eligibleQuantity: {
        '@type': 'QuantitativeValue',
        value: 1,
        unitText: 'license',
      },
      availability: 'https://schema.org/InStock',
    };
  }

  const description = `${canonical.tagline} Includes: ${canonical.features.join(', ')}.`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Offer',
    name: `${tier.name} plan`,
    description,
    inLanguage: 'es',
    price: priceUsd.toFixed(2),
    priceCurrency: 'USD',
    category: 'Trading journal subscription',
    eligibleQuantity: {
      '@type': 'QuantitativeValue',
      value: 1,
      unitText: 'license',
    },
    ...(cycle === 'annual'
      ? { billingIncrement: 12, billingDuration: 'P1Y' }
      : { billingIncrement: 1, billingDuration: 'P1M' }),
  };
}

/**
 * Build the canonical 3-offer JSON-LD payload for the pricing page.
 * Schema.org `name` is English with `inLanguage: 'es'` per mem #68.
 */
export function buildPricingOffers(cycle: BillingCycle): JsonLdNode[] {
  return PRICING_TIERS.map((tier) => buildOffer(tier, cycle));
}
