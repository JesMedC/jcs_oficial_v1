import { SeoHead } from '../components/SeoHead';
import { Hero } from '../components/home/Hero';
import { DashboardPreview } from '../components/home/DashboardPreview';
import { FeaturesGrid } from '../components/home/FeaturesGrid';
import { AboutTeaser } from '../components/home/AboutTeaser';
import { ContactTeaser } from '../components/home/ContactTeaser';
import { CtaStrip } from '../components/home/CtaStrip';

/*
 * p1c — Home page.
 *
 * Composes Hero (with embedded DashboardPreview) + FeaturesGrid +
 * AboutTeaser + ContactTeaser + CtaStrip. Per mem #73 the canonical
 * domain is `https://jadecapitalsuite.com`; SeoHead uses that base.
 */
export function HomePage() {
  return (
    <>
      <SeoHead
        title="Inicio"
        description="JadeCapitalSuite: registra tus operaciones de Forex y binarias, controla los saldos de tus cuentas y analiza tu P&L para operar con mas claridad, confianza y disciplina."
        canonicalPath="/"
      />
      <Hero preview={<DashboardPreview />} />
      <FeaturesGrid />
      <CtaStrip />
      <AboutTeaser />
      <ContactTeaser />
    </>
  );
}
