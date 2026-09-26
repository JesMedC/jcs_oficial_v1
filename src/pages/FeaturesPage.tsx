import { SeoHead } from '../components/SeoHead';
import { FeaturesGrid } from '../components/features/FeaturesGrid';
import { PublicPageIntro } from '../components/home/PublicPageIntro';

/*
 * p1c — Features page.
 *
 * Hero (Orbitron jade) + 4-card features grid. Mirrors the Angular
 * app content verbatim per user prompt.
 */
export function FeaturesPage() {
  return (
    <>
      <SeoHead
        title="Caracteristicas"
        description="Controla tus cuentas, registra cada operacion, analiza tu rendimiento y mejora tu disciplina. Forex, binarias y metricas avanzadas."
        canonicalPath="/features"
      />
      <PublicPageIntro
        eyebrow="Todo conectado"
        title="Todo lo que necesitás, en un solo lugar"
        description="Registrá tus operaciones, seguí tu rendimiento y construí consistencia."
      />
      <FeaturesGrid />
    </>
  );
}
