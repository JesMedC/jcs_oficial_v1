import { Link } from 'react-router-dom';
import { GlassCard } from '../GlassCard';

/*
 * p1c — Home "About" teaser card linking to the full About page.
 * The full About page renders the full story + stats in p1c too;
 * this is a condensed entry point shown on the home page.
 */
export function AboutTeaser() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
      <GlassCard variant="elevated" className="p-6 md:p-8">
        <div className="grid md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2 flex flex-col gap-3">
            <h2 className="font-display uppercase tracking-wide text-primary text-2xl md:text-3xl">
              Nosotros
            </h2>
            <p className="text-text-secondary font-body text-sm md:text-base leading-relaxed">
              Trading Journal Pro nacio de la necesidad real de los traders de tener claridad y
              disciplina. Construimos esta plataforma para que tomes el control de tu operativa,
              entiendas tu rendimiento y construyas consistencia a largo plazo.
            </p>
            <p className="text-primary font-body text-sm md:text-base">
              Hecho por traders, para traders.
            </p>
          </div>
          <div className="flex md:justify-end">
            <Link
              to="/about"
              className="inline-flex border-2 border-primary text-primary font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:bg-primary hover:text-bg transition-colors text-sm"
            >
              Conoce al equipo
            </Link>
          </div>
        </div>
      </GlassCard>
    </section>
  );
}
