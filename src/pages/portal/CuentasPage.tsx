/*
 * p0d.2 — Portal CuentasPage.
 *
 * Placeholder. Full implementation (CRUD de trading accounts) ships
 * in the next work-unit (p0d.3) which already has the backend service
 * scaffolded (`backend/app/services/trading_account_service.py`).
 *
 * Lives inside PortalShell so users see the sidebar + brand context
 * even on the stub. The "Cargando..." copy signals the section is
 * live but empty for now.
 */
import { GlassCard } from '../../components/GlassCard';

export function CuentasPage() {
  return (
    <>
      <h1 className="sr-only">Cuentas</h1>
      <GlassCard variant="default" className="max-w-2xl">
        <h2 className="font-display uppercase tracking-wide text-primary text-2xl md:text-3xl">
          Mis cuentas
        </h2>
        <p className="text-text-secondary font-body text-sm md:text-base mt-3">
          Proximamente — aca vas a poder crear y administrar tus cuentas de trading.
        </p>
        <p className="text-text-muted font-body text-xs md:text-sm mt-4">Cargando...</p>
      </GlassCard>
    </>
  );
}
