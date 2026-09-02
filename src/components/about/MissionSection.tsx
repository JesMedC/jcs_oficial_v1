import { GlassCard } from '../GlassCard';

/*
 * p1c — About / Mission section.
 *
 * Two columns: cyan chart-line SVG illustration + story text + tagline.
 */
export function MissionSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-20">
      <GlassCard variant="elevated" className="p-6 md:p-10">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="flex justify-center">
            <ChartLine />
          </div>
          <div className="flex flex-col gap-4">
            <h2 className="font-display uppercase tracking-wide text-primary text-2xl md:text-3xl">
              Nosotros
            </h2>
            <p className="text-text-secondary font-body text-base md:text-lg leading-relaxed">
              Trading Journal Pro nacio de la necesidad real de los traders de tener claridad y
              disciplina. Hemos estado en tu lugar: buenas rachas, malas decisiones y cuentas que no
              suman el esfuerzo real. Creamos esta plataforma para que tomes el control de tu
              operativa, entiendas tu rendimiento y construyas consistencia a largo plazo.
            </p>
            <p
              className="text-primary font-body text-base md:text-lg mt-1"
              aria-label="Hecho por traders, para traders"
            >
              <span className="text-primary" aria-hidden="true">
                &#9829;
              </span>{' '}
              Hecho por traders, para traders.
            </p>
          </div>
        </div>
      </GlassCard>
    </section>
  );
}

function ChartLine() {
  return (
    <svg
      width="240"
      height="180"
      viewBox="0 0 240 180"
      fill="none"
      stroke="#00FFFF"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-primary"
      role="img"
      aria-label="Curva de crecimiento"
    >
      <defs>
        <linearGradient id="cyanFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00FFFF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#00FFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M10,140 L40,120 L70,130 L100,100 L130,110 L160,80 L190,70 L220,40 L230,30"
        fill="none"
        stroke="#00FFFF"
        strokeWidth="2.5"
      />
      <path
        d="M10,140 L40,120 L70,130 L100,100 L130,110 L160,80 L190,70 L220,40 L230,30 L230,170 L10,170 Z"
        fill="url(#cyanFill)"
        stroke="none"
      />
      <circle cx="160" cy="80" r="3" fill="#00FFFF" />
      <circle cx="220" cy="40" r="3" fill="#00FFFF" />
    </svg>
  );
}
