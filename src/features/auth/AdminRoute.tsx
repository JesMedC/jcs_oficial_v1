/*
 * p0a.2 — AdminRoute.
 *
 * Same shape as ProtectedRoute but additionally requires the user
 * to have role = ADMIN or BOTH. Users with role = USER (or guests)
 * see a "Acceso restringido" panel with a CTA back to the public
 * site instead of being silently redirected to /login — this
 * keeps the security boundary explicit without being hostile.
 */
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';

import { RouteFallback } from '../../components/RouteFallback';
import { GlassCard } from '../../components/GlassCard';
import { canAccessAdmin } from './authStorage';
import { useAuth } from './useAuth';

export function AdminRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <RouteFallback label="Verificando sesion" />;
  }

  if (user === null) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!canAccessAdmin(user.role)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
        <GlassCard variant="elevated" className="max-w-md w-full text-center">
          <h1 className="font-display uppercase tracking-wide text-primary text-2xl md:text-3xl">
            Acceso restringido
          </h1>
          <p className="text-text-secondary font-body text-sm md:text-base mt-3">
            Esta seccion es solo para administradores. Si crees que es un error, contactanos.
          </p>
          <Link
            to="/"
            className="inline-block mt-6 bg-primary text-bg font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:shadow-[0_0_24px_rgba(0,255,255,0.5)] transition-shadow text-sm"
          >
            Volver al inicio
          </Link>
        </GlassCard>
      </div>
    );
  }

  return <Outlet />;
}
