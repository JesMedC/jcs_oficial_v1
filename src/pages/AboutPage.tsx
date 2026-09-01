import { SeoHead } from '../components/SeoHead';
import { MissionSection } from '../components/about/MissionSection';
import { StatsGrid } from '../components/about/StatsGrid';

/*
 * p1c — About / Nosotros page.
 *
 * Composes Hero, MissionSection (story + "Hecho por traders, para
 * traders" tagline), and StatsGrid (4 cards: Traders activos,
 * Operaciones registradas, Paises, Valoracion promedio).
 */
export function AboutPage() {
  return (
    <>
      <SeoHead
        title="Nosotros"
        description="Trading Journal Pro nacio de la necesidad real de los traders de tener claridad y disciplina. Hecho por traders, para traders."
        canonicalPath="/about"
      />
      <section className="max-w-7xl mx-auto px-4 md:px-8 pt-16 md:pt-24 pb-4 text-center">
        <h1
          className="font-display uppercase tracking-wide text-primary text-4xl md:text-5xl"
          style={{ textShadow: '0 0 20px rgba(0,255,255,0.4)' }}
        >
          Hecho por traders, para traders
        </h1>
        <p className="text-text-secondary font-body text-base md:text-lg mt-4 max-w-2xl mx-auto">
          Mas de 15.000 traders activos en 90 paises confian en JadeCapitalSuite para tomar mejores
          decisiones.
        </p>
      </section>
      <MissionSection />
      <StatsGrid />
    </>
  );
}
