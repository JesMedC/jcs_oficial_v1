/*
 * p0e.1 — Portal PlaybookPage.
 *
 * Stub. Playbook (biblioteca de estrategias y setups) lands in a
 * later module. The sidebar entry ships now so the navigation
 * shows the full product surface from day one
 * (Dashboard → Cuentas → Operaciones → Diario → Playbook →
 * Configuración). Same minimal stub pattern as DiarioPage and
 * OperacionesPage: visible Orbitron H1 in jade + a single
 * GlassCard with the "Próximamente" copy.
 */
import { GlassCard } from '../../components/GlassCard';

export function PlaybookPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-16">
      <h1
        className="font-display uppercase tracking-wide text-primary text-2xl md:text-3xl"
        style={{ textShadow: '0 0 20px rgba(0,255,255,0.4)' }}
      >
        Playbook
      </h1>
      <GlassCard variant="default" className="mt-8 max-w-2xl">
        <p className="text-text-secondary font-body text-sm md:text-base">
          Próximamente — tu biblioteca de estrategias y setups.
        </p>
      </GlassCard>
    </div>
  );
}
