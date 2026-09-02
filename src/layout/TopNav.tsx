import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { TopNavMobileDrawer } from './TopNavMobileDrawer';
import { useAuth } from '../features/auth/useAuth';

/*
 * p0b.2 + hide-public-chrome-on-auth — TopNav with auth-aware chrome.
 *
 * Behavior:
 *   - When the user is signed out: shows the public marketing chrome
 *     — brand link to `/`, public nav (Inicio / Características /
 *     Precios / Nosotros), and the dual CTA (Registrarse +
 *     Iniciar sesión). This is the registration-first pivot (see mem
 *     #77, p0b.1b).
 *   - When the user is signed in: the public chrome collapses.
 *     The brand becomes plain text (no link to `/` — the portal has
 *     its own sidebar for navigation), the public nav links disappear
 *     (the portal sidebar renders the in-app nav), the dual CTA is
 *     gone, and the right side shows `first_name + last_name` plus a
 *     direct "Cerrar sesión" button (no dropdown — keep the surface
 *     minimal). The mobile burger is hidden too; the portal's own
 *     sidebar handles mobile navigation.
 *
 * The dropdown + admin-link logic from p0b.2 was removed because the
 * portal sidebar (p0d.2) and the admin top bar (`AdminTopBar`) own
 * their respective navigation surfaces — duplicating them in the
 * public TopNav was redundant once we hide the public chrome for
 * authenticated users.
 *
 * `useAuth().logout()` clears tokens via the API and navigates to
 * `/login`. We keep that destination for consistency with the
 * DashboardPage logout button (also using `useAuth().logout()`).
 */
function buildDisplayName(user: { first_name: string; last_name: string; email: string }): string {
  const full = `${user.first_name} ${user.last_name}`.trim();
  return full.length > 0 ? full : user.email;
}

export function TopNav() {
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const navigate = useNavigate();
  const { user, logout, loading } = useAuth();
  const isAuthenticated = user !== null;

  const handleLogout = () => {
    setDrawerOpen(false);
    // `useAuth().logout()` calls the backend, clears sessionStorage,
    // sets `user = null`, and navigates to `/login`. Keep that
    // destination for consistency with DashboardPage + AdminTopBar.
    void logout().catch(() => {
      /* logout is best-effort — fall through to home if it failed */
      navigate('/');
    });
  };

  const displayName = isAuthenticated ? buildDisplayName(user) : null;

  return (
    <>
      <header className="sticky top-0 z-40 bg-surface/40 backdrop-blur-xl backdrop-saturate-150 border-b border-primary/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-6">
          {isAuthenticated ? (
            <span
              data-testid="topnav-brand"
              className="font-display uppercase tracking-[0.2em] text-primary text-sm md:text-base flex items-center gap-2 shrink-0"
            >
              <span className="inline-block w-2 h-2 rounded-full bg-primary shadow-[0_0_12px_rgba(0,255,255,0.6)]" />
              JadeCapitalSuite
            </span>
          ) : (
            <Link
              to="/"
              data-testid="topnav-brand"
              className="font-display uppercase tracking-[0.2em] text-primary text-sm md:text-base flex items-center gap-2 shrink-0"
            >
              <span className="inline-block w-2 h-2 rounded-full bg-primary shadow-[0_0_12px_rgba(0,255,255,0.6)]" />
              JadeCapitalSuite
            </Link>
          )}

          {!isAuthenticated ? (
            <nav
              data-testid="topnav-public-links"
              className="hidden md:flex items-center gap-6"
            >
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
          ) : null}

          <div className="flex items-center gap-2 md:gap-3">
            {!isAuthenticated && !loading ? (
              <div data-testid="topnav-public-cta" className="flex items-center gap-2 md:gap-3">
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
              </div>
            ) : null}

            {isAuthenticated && displayName !== null ? (
              <div data-testid="topnav-auth-chrome" className="flex items-center gap-2 md:gap-3">
                <span
                  data-testid="topnav-user-name"
                  className="hidden md:inline text-text-secondary font-body text-sm max-w-[160px] truncate"
                >
                  {displayName}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  data-testid="topnav-logout"
                  className="inline-flex border-2 border-primary text-primary font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:bg-primary hover:text-bg transition-colors text-sm"
                >
                  Cerrar sesion
                </button>
              </div>
            ) : null}

            {!isAuthenticated ? (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
                aria-label="Abrir menu"
                aria-expanded={drawerOpen}
              >
                <span className="block w-5 h-0.5 bg-current relative before:content-[''] before:absolute before:left-0 before:-top-1.5 before:w-5 before:h-0.5 before:bg-current after:content-[''] after:absolute after:left-0 after:top-1.5 after:w-5 after:h-0.5 after:bg-current" />
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {drawerOpen ? (
        <TopNavMobileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      ) : null}
    </>
  );
}

const navItems: ReadonlyArray<{ label: string; to: string }> = [
  { label: 'Inicio', to: '/' },
  { label: 'Caracteristicas', to: '/features' },
  { label: 'Precios', to: '/pricing' },
  { label: 'Nosotros', to: '/about' },
];
