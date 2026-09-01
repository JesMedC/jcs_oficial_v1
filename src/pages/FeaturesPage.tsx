import { SeoHead } from '../components/SeoHead';
import { FeaturesGrid } from '../components/features/FeaturesGrid';

/*
 * p1c — Features page.
 *
 * Hero (Orbitron cyan) + 4-card features grid. Mirrors the Angular
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
      <section className="max-w-7xl mx-auto px-4 md:px-8 pt-16 md:pt-24 pb-8 text-center">
        <h1
          className="font-display uppercase tracking-wide text-primary text-4xl md:text-5xl"
          style={{ textShadow: '0 0 20px rgba(0,255,255,0.4)' }}
        >
          Todo lo que necesitás, en un solo lugar
        </h1>
        <p className="text-text-secondary font-body text-base md:text-lg mt-4 max-w-2xl mx-auto">
          Registra tus operaciones, sigue tu rendimiento y construye consistencia.
        </p>
      </section>
      <FeaturesGrid />
    </>
  );
}
