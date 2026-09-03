/*
 * p0e.1 — Portal DiarioPage.
 *
 * Stub. Diario de Trading lands in a later module. The sidebar
 * entry ships now so users see the full product navigation in
 * place (Dashboard, Cuentas, Operaciones, Diario, Playbook,
 * Configuración). The page itself mirrors OperacionesPage:
 * visible Orbitron H1 in jade + a single GlassCard with the
 * "Próximamente" copy that hints at what the module will do
 * (línea de tiempo de trading con notas y tags emocionales).
 */
import { GlassCard } from '../../components/GlassCard';

export function DiarioPage() {
  return (
    <div className="w-full px-2 md:px-4 py-3 md:py-4">
      <h1 className="font-display uppercase tracking-wide text-2xl md:text-3xl">
        Diario
      </h1>
      <GlassCard variant="default" className="mt-4">
        <p className="text-text-secondary font-body text-sm md:text-base">
          Próximamente — tu línea de tiempo de trading con notas y tags emocionales.
        </p>
      </GlassCard>
    </div>
  );
}
