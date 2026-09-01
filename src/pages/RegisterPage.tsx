/*
 * p0b.1b — Register page.
 *
 * Real page (replaces the p1e stub in `_stub.tsx`). The trial copy
 * was changed from "14 dias" to "7 dias" to match the backend
 * STARTER trial (see mem #77 — p0b.1a created a 7-day trial
 * subscription on register).
 *
 * Includes a "7 dias gratis" badge + the RegisterForm + a side panel
 * with what the user gets in the trial.
 */
import { Link } from 'react-router-dom';

import { SeoHead } from '../components/SeoHead';
import { GlassCard } from '../components/GlassCard';
import { RegisterForm } from '../features/auth/RegisterForm';

export function RegisterPage() {
  return (
    <>
      <SeoHead
        title="Crear cuenta"
        description="Crea tu cuenta en JadeCapitalSuite y prueba la plataforma 7 dias gratis sin tarjeta."
        canonicalPath="/register"
        noindex
      />
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 md:py-20 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div>
          <span className="inline-block px-3 py-1 mb-4 text-xs font-display uppercase tracking-wide text-primary border border-primary/40 rounded-full">
            7 dias gratis
          </span>
          <h1
            className="font-display uppercase tracking-wide text-primary text-3xl md:text-5xl"
            style={{ textShadow: '0 0 20px rgba(0,255,255,0.4)' }}
          >
            Crea tu cuenta
          </h1>
          <p className="text-text-secondary font-body text-sm md:text-base mt-4 max-w-md">
            Empieza a registrar tus operaciones y tomar el control de tu trading en minutos.
          </p>

          <GlassCard variant="default" className="mt-8 max-w-md">
            <h2 className="font-display uppercase tracking-wide text-primary text-sm md:text-base">
              Que incluye el trial
            </h2>
            <ul className="text-text-secondary font-body text-xs md:text-sm mt-3 space-y-2 list-disc list-inside">
              <li>Registro ilimitado de operaciones (forex, binarias, cripto).</li>
              <li>Metricas basicas: P&amp;L, win rate, drawdown.</li>
              <li>Soporte por email durante el trial.</li>
              <li>Sin tarjeta. Cancela cuando quieras, sin permanencia.</li>
            </ul>
          </GlassCard>

          <p className="text-text-muted font-body text-xs mt-6">
            Ya tenes cuenta?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Iniciar sesion
            </Link>
          </p>
        </div>

        <div>
          <RegisterForm />
        </div>
      </div>
    </>
  );
}
