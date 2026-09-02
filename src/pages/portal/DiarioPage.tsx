/*
 * p0e.1 — Portal DiarioPage.
 *
 * Stub. Diario de Trading lands in a later module. The sidebar
 * entry ships now so users see the full product navigation in
 * place (Dashboard, Cuentas, Operaciones, Diario, Playbook,
 * Configuración). The page itself mirrors OperacionesPage:
 * visible Orbitron H1 in cyan + a single GlassCard with the
 * "Próximamente" copy that hints at what the module will do
 * (línea de tiempo de trading con notas y tags emocionales).
 */
import { GlassCard } from '../../components/GlassCard';

export function DiarioPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-16">
      <h1
        className="font-display uppercase tracking-wide text-primary text-3xl md:text-4xl"
        style={{ textShadow: '0 0 20px rgba(0,255,255,0.4)' }}
      >
        Diario
      </h1>
      <GlassCard variant="default" className="mt-8 max-w-2xl">
        <p className="text-text-secondary font-body text-sm md:text-base">
          Próximamente — tu línea de tiempo de trading con notas y tags emocionales.
        </p>
      </GlassCard>
    </div>
  );
}
