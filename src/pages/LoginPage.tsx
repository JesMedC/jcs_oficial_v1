/*
 * p0a.2 — Login page.
 *
 * Real page (replaces the p1e stub in `_stub.tsx`). H1 Orbitron jade
 * + LoginForm + a small aside with the security story (JWT + PBKDF2
 * + 14-day trial). `noindex` is set because the page is behind an
 * auth boundary — search engines should not index it.
 */
import { Link } from 'react-router-dom';

import { SeoHead } from '../components/SeoHead';
import { GlassCard } from '../components/GlassCard';
import { LoginForm } from '../features/auth/LoginForm';

export function LoginPage() {
  return (
    <>
      <SeoHead
        title="Iniciar sesion"
        description="Accede a tu portal de JadeCapitalSuite. Sesion segura con JWT + PBKDF2 y 7 dias gratis."
        canonicalPath="/login"
        noindex
      />
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 md:py-20 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div>
          <h1
            className="font-display uppercase tracking-wide text-primary text-2xl md:text-4xl"
            style={{ textShadow: '0 0 20px rgba(46,220,140,0.4)' }}
          >
            Bienvenido de nuevo
          </h1>
          <p className="text-text-secondary font-body text-sm md:text-base mt-4 max-w-md">
            Inicia sesion para registrar operaciones, controlar cuentas y revisar tus metricas.
          </p>

          <GlassCard variant="default" className="mt-8 max-w-md">
            <h2 className="font-display uppercase tracking-wide text-primary text-sm md:text-base">
              Tu sesion esta protegida
            </h2>
            <ul className="text-text-secondary font-body text-xs md:text-sm mt-3 space-y-2 list-disc list-inside">
              <li>Contrasenas hasheadas con PBKDF2 + sal por usuario.</li>
              <li>Tokens de acceso JWT firmados (HS256) y rotacion automatica.</li>
              <li>7 dias gratis sin tarjeta. Cancela cuando quieras.</li>
            </ul>
          </GlassCard>

          <p className="text-text-muted font-body text-xs mt-6">
            Aun no tenes cuenta?{' '}
            <Link to="/register" className="text-primary hover:underline">
              Crear cuenta gratis
            </Link>
          </p>
        </div>

        <div>
          <LoginForm />
        </div>
      </div>
    </>
  );
}
