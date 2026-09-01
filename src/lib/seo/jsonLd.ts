/*
 * p1c — basic JSON-LD Offer builder for the 3 Starter/Pro/Elite tiers.
 *
 * Full Zod-strict builders (Organization, SoftwareApplication, Offer with
 * `inLanguage: 'es'`, validate-jsonld.mjs build-time check) land in p1f.
 * This file is intentionally minimal: it produces schema.org valid Offer
 * JSON-LD with `name` in English and `inLanguage: 'es'` per mem #68.
 *
 * Per mem #70, the pricing structure was OVERRIDDEN from the original
 * Free/Plus/Pro (4-tier) plan in mem #66/#67/#69 to Starter/Pro/Elite
 * (3-tier) per the Angular app reference. This file is the single source
 * of truth for the canonical tier list at the SEO/JSON-LD layer.
 */

import type { JsonLdNode } from '../../components/JsonLd';

export type BillingCycle = 'monthly' | 'annual';

export interface PricingTierSeo {
  readonly id: 'starter' | 'pro' | 'elite';
  readonly name: string;
  readonly tagline: string;
  readonly monthlyPriceUsd: number;
  readonly annualPriceUsd: number;
  readonly features: ReadonlyArray<string>;
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
};
const PRO_EN = {
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

export const PRICING_TIERS: ReadonlyArray<PricingTierSeo> = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Para traders que comienzan.',
    monthlyPriceUsd: 9.99,
    annualPriceUsd: 7.99,
    features: [
      '1 cuenta',
      'Registro ilimitado de operaciones',
      'Reportes basicos',
      'Soporte por email',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Para traders que quieren crecer.',
    monthlyPriceUsd: 29.99,
    annualPriceUsd: 23.99,
    features: [
      'Hasta 5 cuentas',
      'Metricas avanzadas y filtros',
      'Reportes personalizados',
      'Exportacion de datos (CSV)',
      'Soporte prioritario',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    tagline: 'Para traders exigentes.',
    monthlyPriceUsd: 99.99,
    annualPriceUsd: 79.99,
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
function canonicalEnCopy(id: PricingTierSeo['id']) {
  if (id === 'starter') return STARTER_EN;
  if (id === 'pro') return PRO_EN;
  return ELITE_EN;
}

/**
 * Build a schema.org Offer JSON-LD object for a single pricing tier.
 *
 * `name` and `description` use English copy because schema.org validators
 * require a single canonical identifier; `inLanguage: 'es'` signals that
 * the offering is presented in Spanish on the page (per mem #68).
 */
export function buildOffer(tier: PricingTierSeo, cycle: BillingCycle): JsonLdNode {
  const priceUsd = cycle === 'monthly' ? tier.monthlyPriceUsd : tier.annualPriceUsd;
  const canonical = canonicalEnCopy(tier.id);
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
