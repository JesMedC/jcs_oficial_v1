import { useState } from 'react';
import { SeoHead } from '../components/SeoHead';
import { BillingCycleToggle } from '../components/pricing/BillingCycleToggle';
import { PricingTiersGrid } from '../components/pricing/PricingTiersGrid';
import { ComparisonTable } from '../components/pricing/ComparisonTable';
import { FaqAccordion } from '../components/pricing/FaqAccordion';
import { PublicPageIntro } from '../components/home/PublicPageIntro';
import { buildPricingOffers, type BillingCycle } from '../lib/seo/jsonLd';

/*
 * p1c — Pricing page.
 *
 * Composes Hero, BillingCycleToggle, PricingTiersGrid (3 tiers),
 * ComparisonTable, FaqAccordion. Renders 3 Offer JSON-LD entries
 * (Starter / Pro / Elite) with `inLanguage: 'es'` per mem #68.
 */
export function PricingPage() {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const offers = buildPricingOffers(cycle);

  return (
    <>
      <SeoHead
        title="Precios"
        description="Planes simples para traders individuales. Starter, Pro y Elite con metricas avanzadas, reportes y soporte prioritario."
        canonicalPath="/pricing"
        jsonLd={offers}
      />
      <PublicPageIntro
        eyebrow="Elegí tu ritmo"
        title="Planes simples para traders individuales"
        description="Comenzá con 14 días gratis. Cancelá cuando quieras, sin permanencia."
      />
      <div className="mx-auto max-w-7xl px-4 pb-10 md:px-8">
        <BillingCycleToggle cycle={cycle} onChange={setCycle} />
      </div>
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-4">
        <PricingTiersGrid cycle={cycle} />
      </section>
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-4">
        <h2 className="font-display uppercase tracking-wide text-2xl md:text-3xl text-center mb-6 md:mb-8">
          Compara los planes
        </h2>
        <ComparisonTable />
      </section>
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-4">
        <h2 className="font-display uppercase tracking-wide text-2xl md:text-3xl text-center mb-6 md:mb-8">
          Preguntas frecuentes
        </h2>
        <FaqAccordion />
      </section>
    </>
  );
}
