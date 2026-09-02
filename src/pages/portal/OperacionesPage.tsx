/*
 * p0e.1 — Portal OperacionesPage.
 *
 * Stub. Replaces the old MovimientosPage (p0d.2). The product
 * navigation renamed Movimientos → Operaciones and added Diario
 * (Diario de Trading) and Playbook as siblings, so the route
 * moved to /portal/operaciones and this page keeps the original
 * Spanish copy with a slightly more descriptive message.
 *
 * The operations log (forex, binarias, cripto trades) lands in
 * Module C. This page is intentionally minimal: visible Orbitron
 * H1 in cyan (matching DashboardPage / CuentasPage) + a single
 * GlassCard with the "Próximamente" copy — same stub pattern as
 * ConfiguracionPage but with a visible heading so the screen
 * reader and the page TOC read it correctly on the first visit.
 */
import { GlassCard } from '../../components/GlassCard';

export function OperacionesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-16">
      <h1
        className="font-display uppercase tracking-wide text-primary text-3xl md:text-4xl"
        style={{ textShadow: '0 0 20px rgba(0,255,255,0.4)' }}
      >
        Operaciones
      </h1>
      <GlassCard variant="default" className="mt-8 max-w-2xl">
        <p className="text-text-secondary font-body text-sm md:text-base">
          Próximamente — acá vas a poder registrar y analizar tus trades.
        </p>
      </GlassCard>
    </div>
  );
}
