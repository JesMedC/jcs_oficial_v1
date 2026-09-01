/*
 * p0a.2 — portal storage helpers.
 *
 * Lives outside AuthProvider so that file only exports the
 * React component (keeps Fast Refresh happy) while these
 * pure-function helpers are easy to test in isolation.
 */

export type Portal = 'user' | 'admin';

const PORTAL_KEY = 'jcs.portal';

export function readStoredPortal(): Portal | null {
  const raw = sessionStorage.getItem(PORTAL_KEY);
  if (raw === 'user' || raw === 'admin') return raw;
  return null;
}

export function writeStoredPortal(portal: Portal): void {
  sessionStorage.setItem(PORTAL_KEY, portal);
}

export function clearStoredPortal(): void {
  sessionStorage.removeItem(PORTAL_KEY);
}

import type { UserRole } from './types';

/**
 * Roles that may access the admin portal. BOTH is allowed because
 * internal staff uses the admin area; the portal selector lets them
 * pick which surface to enter.
 */
export function canAccessAdmin(role: UserRole | undefined): boolean {
  return role === 'ADMIN' || role === 'BOTH';
}
