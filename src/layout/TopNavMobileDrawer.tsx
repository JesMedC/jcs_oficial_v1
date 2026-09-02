import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../features/auth/useAuth';

interface TopNavMobileDrawerProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

/*
 * hide-public-chrome-on-auth — mobile drawer mirrors the desktop
 * TopNav split. When the user is signed out it shows the public nav
 * links + Registrarse / Iniciar sesión CTAs. When the user is signed
 * in it renders their name + a direct "Cerrar sesion" button (the
 * portal sidebar already handles in-portal navigation, so the public
 * marketing nav is suppressed). The drawer only opens for signed-out
 * visitors in the first place (the desktop burger button is hidden
 * when authenticated), but we still gate the content defensively.
 */

const publicNavItems: ReadonlyArray<{ label: string; to: string }> = [
  { label: 'Inicio', to: '/' },
  { label: 'Características', to: '/features' },
  { label: 'Precios', to: '/pricing' },
  { label: 'Nosotros', to: '/about' },
];

export function TopNavMobileDrawer({ open, onClose }: TopNavMobileDrawerProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAuthenticated = user !== null;
  const displayName = isAuthenticated
    ? `${user.first_name} ${user.last_name}`.trim() || user.email
    : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleLogout = () => {
    onClose();
    void logout().catch(() => {
      /* best-effort — fall through to home if the API call failed */
      navigate('/');
    });
  };

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

        {isAuthenticated ? (
          <>
            {displayName !== null ? (
              <div
                data-testid="topnav-mobile-user-name"
                className="text-text-secondary font-body text-sm"
              >
                {displayName}
              </div>
            ) : null}
            <button
              type="button"
              onClick={handleLogout}
              data-testid="topnav-mobile-logout"
              className="inline-flex justify-center border-2 border-primary text-primary font-display uppercase tracking-wide px-3 py-1.5 rounded-lg hover:bg-primary hover:text-bg transition-colors"
            >
              Cerrar sesion
            </button>
          </>
        ) : (
          <>
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
                className="inline-flex justify-center bg-primary text-bg font-display uppercase tracking-wide px-3 py-1.5 rounded-lg hover:shadow-[0_0_24px_rgba(0,255,255,0.5)] transition-shadow"
              >
                Iniciar sesión
              </a>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
