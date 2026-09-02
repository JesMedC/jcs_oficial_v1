/*
 * p0d.2 — Portal MovimientosPage.
 *
 * Stub. The operations log (forex, binarias, cripto trades) lands in
 * a later work-unit once the journal/metricas pipeline is built
 * (p0e+). This page gives the sidebar nav a real target so users see
 * "we know this is coming" rather than a 404.
 */
import { GlassCard } from '../../components/GlassCard';

export function MovimientosPage() {
  return (
    <>
      <h1 className="sr-only">Movimientos</h1>
      <GlassCard variant="default" className="max-w-2xl">
        <h2 className="font-display uppercase tracking-wide text-primary text-2xl md:text-3xl">
          Movimientos
        </h2>
        <p className="text-text-secondary font-body text-sm md:text-base mt-3">
          Proximamente — esta seccion estara disponible pronto.
        </p>
      </GlassCard>
    </>
  );
}
