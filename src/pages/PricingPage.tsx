import { useState } from 'react';
import { SeoHead } from '../components/SeoHead';
import { BillingCycleToggle } from '../components/pricing/BillingCycleToggle';
import { PricingTiersGrid } from '../components/pricing/PricingTiersGrid';
import { ComparisonTable } from '../components/pricing/ComparisonTable';
import { FaqAccordion } from '../components/pricing/FaqAccordion';
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
      <section className="max-w-7xl mx-auto px-4 md:px-8 pt-16 md:pt-24 pb-8 text-center">
        <h1
          className="font-display uppercase tracking-wide text-primary text-3xl md:text-4xl"
          style={{ textShadow: '0 0 20px rgba(0,255,255,0.4)' }}
        >
          Planes simples para traders individuales
        </h1>
        <p className="text-text-secondary font-body text-base md:text-lg mt-4 max-w-2xl mx-auto">
          Comienza con 14 dias gratis. Cancela cuando quieras, sin permanencia.
        </p>
        <div className="mt-8">
          <BillingCycleToggle cycle={cycle} onChange={setCycle} />
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-16 md:pb-24">
        <PricingTiersGrid cycle={cycle} />
      </section>
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-16 md:pb-24">
        <h2 className="font-display uppercase tracking-wide text-primary text-2xl md:text-3xl text-center mb-6 md:mb-8">
          Compara los planes
        </h2>
        <ComparisonTable />
      </section>
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-20 md:pb-28">
        <h2 className="font-display uppercase tracking-wide text-primary text-2xl md:text-3xl text-center mb-6 md:mb-8">
          Preguntas frecuentes
        </h2>
        <FaqAccordion />
      </section>
    </>
  );
}
