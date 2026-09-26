import { SeoHead } from '../components/SeoHead';
import { MissionSection } from '../components/about/MissionSection';
import { StatsGrid } from '../components/about/StatsGrid';
import { PublicPageIntro } from '../components/home/PublicPageIntro';

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
      <PublicPageIntro
        eyebrow="Nuestra misión"
        title="Hecho por traders, para traders"
        description="Más de 15.000 traders activos en 90 países confían en JadeCapitalSuite para tomar mejores decisiones."
      />
      <MissionSection />
      <StatsGrid />
    </>
  );
}
