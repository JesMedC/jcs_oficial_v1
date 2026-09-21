/*
 * p0a.2 — ProtectedRoute.
 *
 * Wraps a route subtree behind a signed-in check. While the auth
 * context is bootstrapping (loading=true) we render the standard
 * centered spinner via `RouteFallback` so the user never sees a
 * flash of the login page. If no user is loaded, redirect to
 * /login while preserving the original location in `state.from`
 * (so the login flow can return them after success).
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { RouteFallback } from '../../components/RouteFallback';
import { useAuth } from './useAuth';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <RouteFallback label="Verificando sesion" />;
  }

  if (user === null) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
