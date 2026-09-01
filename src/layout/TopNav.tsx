import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { TopNavMobileDrawer } from './TopNavMobileDrawer';
import { useAuth } from '../features/auth/useAuth';
import { ADMIN_ROLES, UserRoles, type UserRole } from '../features/auth/types';
import { readStoredPortal } from '../features/auth/authStorage';

/*
 * p0b.1b — TopNav with auth-aware CTA + portal-aware Admin link.
 *
 * Behavior:
 *   - When the user is signed out, the dual CTA is "Registrarse"
 *     (outline) + "Iniciar sesion" (filled). The previous "Solicitar
 *     demo" link is gone per the registration-first pivot (see mem
 *     #77, p0b.1b).
 *   - When the user is signed in:
 *       * If their role is ADMIN or BOTH AND `jcs.portal === 'admin'`,
 *         show a small "Admin" link right before the user avatar.
 *       * Replace the dual CTA with a circular avatar (first letter
 *         of the user's first_name) + a dropdown containing
 *         "Cerrar sesion".
 *       * Show the user's name next to the avatar in a small label.
 *   - The dropdown closes on outside click via a backdrop overlay
 *     (intentionally simple — no Radix, no popper; this is the
 *     minimal surface for v0).
 */
function isAdminPortalActive(
  role: UserRole | undefined,
  portal: ReturnType<typeof readStoredPortal>,
): boolean {
  if (role === undefined) return false;
  return ADMIN_ROLES.includes(role) && portal === 'admin' && role !== UserRoles.USER;
}

export function TopNav() {
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const { user, logout, loading } = useAuth();
  const portal = readStoredPortal();
  const showAdminLink = isAdminPortalActive(user?.role, portal);

  const displayName = user?.first_name ?? user?.email ?? 'trader';
  const initials = (user?.first_name ?? '?').trim().slice(0, 1).toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-40 bg-surface/40 backdrop-blur-xl backdrop-saturate-150 border-b border-primary/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-6">
          <Link
            to="/"
            className="font-display uppercase tracking-[0.2em] text-primary text-sm md:text-base flex items-center gap-2 shrink-0"
          >
            <span className="inline-block w-2 h-2 rounded-full bg-primary shadow-[0_0_12px_rgba(0,255,255,0.6)]" />
            JadeCapitalSuite
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  [
                    'relative font-body text-sm transition-colors',
                    isActive
                      ? 'font-display tracking-wide text-primary after:content-[""] after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-0.5 after:bg-primary after:shadow-[0_0_8px_rgba(0,255,255,0.8)]'
                      : 'text-text-primary hover:text-primary',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            {user === null && !loading ? (
              <>
                <Link
                  to="/register"
                  className="hidden md:inline-flex border-2 border-primary text-primary font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:bg-primary hover:text-bg transition-colors text-sm"
                >
                  Registrarse
                </Link>
                <Link
                  to="/login"
                  className="inline-flex bg-primary text-bg font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:shadow-[0_0_24px_rgba(0,255,255,0.5)] transition-shadow text-sm"
                >
                  Iniciar sesion
                </Link>
              </>
            ) : null}

            {showAdminLink ? (
              <Link
                to="/admin"
                className="hidden md:inline-flex items-center gap-1 border border-primary/40 text-primary font-display uppercase tracking-wide px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors text-xs"
              >
                Admin
              </Link>
            ) : null}

            {user !== null ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label={`Menu de ${displayName}`}
                >
                  <span className="hidden md:inline text-text-secondary font-body text-sm max-w-[140px] truncate">
                    {displayName}
                  </span>
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary/15 border border-primary/40 text-primary font-display uppercase text-sm">
                    {initials}
                  </span>
                </button>
                {menuOpen ? (
                  <>
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-hidden="true"
                      onClick={() => setMenuOpen(false)}
                      className="fixed inset-0 z-30 cursor-default"
                    />
                    <div
                      role="menu"
                      className="absolute right-0 top-12 z-40 min-w-[200px] bg-surface-el/95 backdrop-blur-md border border-primary/30 rounded-xl py-2 shadow-elevated"
                    >
                      <Link
                        to="/dashboard"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 text-text-primary font-body text-sm hover:bg-primary/10"
                      >
                        Mi portal
                      </Link>
                      {showAdminLink ? (
                        <Link
                          to="/admin"
                          role="menuitem"
                          onClick={() => setMenuOpen(false)}
                          className="block px-4 py-2 text-text-primary font-body text-sm hover:bg-primary/10"
                        >
                          Portal admin
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          void logout();
                        }}
                        className="w-full text-left px-4 py-2 text-text-primary font-body text-sm hover:bg-primary/10"
                      >
                        Cerrar sesion
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
              aria-label="Abrir menu"
              aria-expanded={drawerOpen}
            >
              <span className="block w-5 h-0.5 bg-current relative before:content-[''] before:absolute before:left-0 before:-top-1.5 before:w-5 before:h-0.5 before:bg-current after:content-[''] after:absolute after:left-0 after:top-1.5 after:w-5 after:h-0.5 after:bg-current" />
            </button>
          </div>
        </div>
      </header>

      <TopNavMobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

const navItems: ReadonlyArray<{ label: string; to: string }> = [
  { label: 'Inicio', to: '/' },
  { label: 'Caracteristicas', to: '/features' },
  { label: 'Precios', to: '/pricing' },
  { label: 'Nosotros', to: '/about' },
];
