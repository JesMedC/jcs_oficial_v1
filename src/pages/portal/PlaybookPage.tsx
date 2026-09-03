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
    <div className="w-full px-2 md:px-4 py-3 md:py-4">
      <h1 className="font-display uppercase tracking-wide text-2xl md:text-3xl">
        Playbook
      </h1>
      <GlassCard variant="default" className="mt-4">
        <p className="text-text-secondary font-body text-sm md:text-base">
          Próximamente — tu biblioteca de estrategias y setups.
        </p>
      </GlassCard>
    </div>
  );
}
