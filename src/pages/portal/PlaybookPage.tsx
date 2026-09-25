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
import { PageHeader } from '../../components/ui/PageHeader';
import { HudPanel } from '../../components/ui/HudPanel';

export function PlaybookPage() {
  return (
    <div className="w-full px-2 md:px-4 py-3 md:py-4">
      <PageHeader
        subLabel="Biblioteca · Estrategias"
        title="Playbook"
        subtitle="Próximamente — tu biblioteca de estrategias y setups."
      />
      <HudPanel variant="default" padding="lg" className="mt-4">
        <p className="text-text-secondary font-body text-sm md:text-base">
          Estamos armando la sección de playbooks. Mientras tanto, podés
          registrar tus setups en el Diario de trading.
        </p>
      </HudPanel>
    </div>
  );
}
