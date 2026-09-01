/*
 * p0a.2 — auth hook. Thin wrapper over the AuthContext so call sites
 * can pull auth state without depending on the React context type
 * directly. Throws if used outside <AuthProvider> so misuse is loud.
 */
import { useContext } from 'react';

import { AuthContext, type AuthContextValue } from './AuthProvider';

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
}
