import { GlassCard } from '../GlassCard';

/*
 * p1c — Stats grid (4 cards).
 *
 * 2x2 on desktop, single column on mobile. Each card: value (Orbitron
 * uppercase tracking-wide cyan) + label (Inter text-secondary).
 */
export function StatsGrid() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        {stats.map((s) => (
          <GlassCard key={s.label} variant="default" className="text-center p-6 md:p-8">
            <p className="font-display uppercase tracking-wide text-primary text-3xl md:text-5xl">
              {s.value}
            </p>
            <p className="text-text-secondary font-body text-sm md:text-base mt-2">{s.label}</p>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}

const stats: ReadonlyArray<{ readonly value: string; readonly label: string }> = [
  { value: '+15K', label: 'Traders activos' },
  { value: '+1.2M', label: 'Operaciones registradas' },
  { value: '90+', label: 'Paises' },
  { value: '4.9/5', label: 'Valoracion promedio' },
];
