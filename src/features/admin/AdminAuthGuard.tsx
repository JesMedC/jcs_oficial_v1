/*
 * p0b.2 — AdminAuthGuard.
 *
 * Three-layer gate before rendering any /admin/* route:
 *   1. Authenticated (AuthProvider.user !== null). Otherwise bounce to
 *      /login preserving the intended URL.
 *   2. role ∈ {ADMIN, BOTH}. Otherwise send the user to /dashboard
 *      with a flash via the existing RouteFallback ("Acceso restringido"
 *      panel from AdminRoute is the canonical surface for role-denied
 *      cases, but inside the admin layout we keep it terse: a single
 *      "No tienes permisos para el panel admin" copy + back link).
 *   3. sessionStorage `jcs.portal === 'admin'`. BOTH-role staff must
 *      explicitly choose the admin portal through PortalSelector (or
 *      via a sidebar link) before they can land here. Forcing this
 *      step prevents an ADMIN-role user from accidentally ending up in
 *      the admin panel when they navigated from a deep-link.
 *
 * Because AdminLayout already sits inside <RouterProvider> (the layout
 * is the route element, not a wrapper around individual pages), the
 * guard calls useLocation only for the redirect `state.from`.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

import { useAuth } from '../auth/useAuth';
import { readStoredPortal } from '../auth/authStorage';
import { ADMIN_ROLES } from '../auth/types';
import { RouteFallback } from '../../components/RouteFallback';
import { GlassCard } from '../../components/GlassCard';

interface AdminAuthGuardProps {
  readonly children?: ReactNode;
}

export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <RouteFallback label="Verificando sesion" />;
  }

  if (user === null) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = user.role;
  const portal = readStoredPortal();

  if (!ADMIN_ROLES.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (portal !== 'admin') {
    // BOTH-role user who hasn't picked the admin portal yet (or ADMIN
    // user who deep-linked from outside). Forward to the selector so
    // they pick a portal explicitly. Preserve the intended URL.
    return <Navigate to="/portal-select" state={{ from: location }} replace />;
  }

  return children !== undefined ? <>{children}</> : <Outlet />;
}

/**
 * Compact "access restricted" panel for BOTH-role users whose portal
 * is `user` but who navigated to /admin via a deep link. Currently
 * unused because we redirect — kept exported so future UX tweaks can
 * surface a friendlier in-app prompt without re-typing the markup.
 */
export function AdminAccessDenied() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <GlassCard variant="elevated" className="max-w-md w-full text-center">
        <h1 className="font-display uppercase tracking-wide text-primary text-2xl md:text-3xl">
          Acceso restringido
        </h1>
        <p className="text-text-secondary font-body text-sm md:text-base mt-3">
          No tienes permisos para acceder al panel de administracion.
        </p>
        <a
          href="/dashboard"
          className="inline-block mt-6 bg-primary text-bg font-display uppercase tracking-wide px-3 py-1.5 rounded-lg hover:shadow-[0_0_24px_rgba(0,255,255,0.5)] transition-shadow text-sm"
        >
          Volver a mi portal
        </a>
      </GlassCard>
    </div>
  );
}
