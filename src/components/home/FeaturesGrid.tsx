import { GlassCard } from '../GlassCard';

/*
 * p1c — Home features grid (4 cards).
 *
 * Cards mirror the "Features" page exactly per Angular content
 * (verbatim copy in user prompt). Each card: jade SVG icon, H3 Inter
 * 600, P Inter text-secondary. 2-col desktop, stacked mobile.
 */
export function FeaturesGrid() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
        {features.map((f) => (
          <GlassCard key={f.title} variant="interactive">
            <FeatureIcon d={f.icon} />
            <h3 className="font-body font-semibold text-text-primary text-lg md:text-xl mt-4">
              {f.title}
            </h3>
            <p className="text-text-secondary font-body text-sm md:text-base mt-2 leading-relaxed">
              {f.description}
            </p>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}

const features: ReadonlyArray<{
  readonly title: string;
  readonly description: string;
  readonly icon: string;
}> = [
  {
    title: 'Controla tus cuentas',
    description:
      'Gestiona multiples cuentas, visualiza saldos en tiempo real y sigue la evolucion de tu capital.',
    icon: 'M3 12a9 9 0 1 0 9-9 9 9 0 0 0-9 9Zm9-3v6m-3-3h6',
  },
  {
    title: 'Registra cada operacion',
    description:
      'Registra Forex y binarias en segundos. Incluye entradas, salidas, tamano, activos y notas.',
    icon: 'M4 4h16v4H4Zm0 6h10v4H4Zm0 6h16v4H4Z',
  },
  {
    title: 'Analiza tu rendimiento',
    description:
      'Metricas avanzadas, graficos interactivos y reportes claros para encontrar tu ventaja.',
    icon: 'M4 20V8m6 12V4m6 16v-8m4 8V12',
  },
  {
    title: 'Mejora tu disciplina',
    description:
      'Detecta patrones, controla el riesgo y toma decisiones basadas en datos, no en emociones.',
    icon: 'M12 2 4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6Z',
  },
];

function FeatureIcon({ d }: { readonly d: string }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#2EDC8C"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-primary"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
