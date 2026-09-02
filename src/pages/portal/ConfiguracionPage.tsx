/*
 * p0d.2 — Portal ConfiguracionPage.
 *
 * Stub. Profile settings (cambio de nombre, telefono, contrasena,
 * preferencias de notificacion) land in a later work-unit (p0f+).
 * Renders a single GlassCard with a H1 + Proximamente copy that
 * matches the spec.
 */
import { GlassCard } from '../../components/GlassCard';

export function ConfiguracionPage() {
  return (
    <>
      <h1 className="sr-only">Configuracion</h1>
      <GlassCard variant="default" className="max-w-2xl">
        <h2 className="font-display uppercase tracking-wide text-primary text-2xl md:text-3xl">
          Configuracion
        </h2>
        <p className="text-text-secondary font-body text-sm md:text-base mt-3">Proximamente.</p>
      </GlassCard>
    </>
  );
}
