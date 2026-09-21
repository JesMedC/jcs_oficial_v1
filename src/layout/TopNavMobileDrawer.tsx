import { useEffect } from 'react';

import { useAuth } from '../features/auth/useAuth';

interface TopNavMobileDrawerProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

/*
 * header-public-auth-aware — mobile drawer mirrors the desktop
 * TopNav split.
 *
 * When the user is signed out it shows the public nav links +
 * Registrarse / Iniciar sesión CTAs (the original behaviour).
 *
 * When the user is signed in it shows the public nav links +
 * the display name + a "Mi portal" CTA. The "Mi portal" target
 * follows the same rule as the desktop TopNav:
 *   - role = BOTH → /portal-select (pick the portal)
 *   - role = USER → /portal/dashboard (direct)
 *
 * The drawer no longer exposes "Cerrar sesion" — that action lives
 * in the portal sidebar (`SidebarFooter`) where the user already is
 * after tapping "Mi portal". The desktop burger button is also
 * visible to authenticated visitors now (the gate that hid it was
 * removed in TopNav.tsx).
 */

const publicNavItems: ReadonlyArray<{ label: string; to: string }> = [
  { label: 'Inicio', to: '/' },
  { label: 'Características', to: '/features' },
  { label: 'Precios', to: '/pricing' },
  { label: 'Nosotros', to: '/about' },
];

function resolvePortalTarget(role: 'USER' | 'ADMIN' | 'BOTH'): string {
  return role === 'BOTH' ? '/portal-select' : '/portal/dashboard';
}

export function TopNavMobileDrawer({ open, onClose }: TopNavMobileDrawerProps) {
  const { user } = useAuth();
  const isAuthenticated = user !== null;
  const displayName = isAuthenticated
    ? `${user.first_name} ${user.last_name}`.trim() || user.email
    : null;
  const portalTarget = isAuthenticated ? resolvePortalTarget(user.role) : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Cerrar menú"
        onClick={onClose}
        className="absolute inset-0 bg-bg/80 backdrop-blur-2xl cursor-default"
      />
      <aside className="absolute right-0 top-0 h-full w-[82%] max-w-sm bg-surface-el/95 border-l border-primary/30 backdrop-blur-2xl p-6 flex flex-col gap-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <span className="font-display uppercase tracking-[0.2em] text-primary text-sm">
            JadeCapitalSuite
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-text-secondary hover:text-primary transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/*
         * header-public-auth-aware — public nav is always rendered,
         * matching the desktop TopNav. We use plain anchors (not
         * react-router Links) because the drawer is a transient
         * overlay that closes on click; full SPA navigation with
         * Link would also work but adds bundle weight to the drawer.
         */}
        <nav className="flex flex-col gap-1">
          {publicNavItems.map((item) => (
            <a
              key={item.label}
              href={item.to}
              onClick={onClose}
              className="font-body text-text-primary hover:text-primary transition-colors py-3 border-b border-primary/10"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {isAuthenticated && displayName !== null && portalTarget !== null ? (
          <div className="flex flex-col gap-3 mt-auto">
            <div
              data-testid="topnav-mobile-user-name"
              className="text-text-secondary font-body text-sm"
            >
              {displayName}
            </div>
            <a
              href={portalTarget}
              onClick={onClose}
              data-testid="topnav-mobile-portal-cta"
              // design-system-v1 (Wave 3a, T3a.1) — neon jade rgba(0,255,157,0.5).
              className="inline-flex justify-center bg-primary text-bg font-display uppercase tracking-wide px-3 py-1.5 rounded-lg hover:shadow-[0_0_24px_rgba(0,255,157,0.5)] transition-shadow"
            >
              Mi portal
            </a>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-auto">
            <a
              href="/register"
              onClick={onClose}
              className="inline-flex justify-center border-2 border-primary text-primary font-display uppercase tracking-wide px-3 py-1.5 rounded-lg hover:bg-primary hover:text-bg transition-colors"
            >
              Registrarse
            </a>
            <a
              href="/login"
              onClick={onClose}
              // design-system-v1 (Wave 3a, T3a.1) — cyan rgba swapped for neon jade rgba(0,255,157,*).
              className="inline-flex justify-center bg-primary text-bg font-display uppercase tracking-wide px-3 py-1.5 rounded-lg hover:shadow-[0_0_24px_rgba(0,255,157,0.5)] transition-shadow"
            >
              Iniciar sesión
            </a>
          </div>
        )}
      </aside>
    </div>
  );
}
