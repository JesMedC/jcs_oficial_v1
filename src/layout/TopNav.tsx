import { Suspense, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { TopNavMobileDrawer } from './TopNavMobileDrawer';
import { useAuth } from '../features/auth/useAuth';
import { NewTradeDrawer } from '../features/trades/NewTradeDrawer';
import { useCommandPaletteHotkey } from '../hooks/useCommandPaletteHotkey';
import { useCommandPalette } from '../stores/useCommandPalette';

/*
 * header-public-auth-aware — TopNav for the public marketing surface.
 *
 * Behavior:
 *   - The brand is ALWAYS a Link to `/`, regardless of auth state.
 *   - The public nav (Inicio / Características / Precios / Nosotros)
 *     is ALWAYS visible — same surface for everyone.
 *   - The right-hand slot swaps based on auth:
 *       · Signed out → dual CTA (Registrarse + Iniciar sesión).
 *       · Signed in  → display name + "Mi portal" CTA.
 *         The "Mi portal" link targets `/portal-select` for BOTH-role
 *         users (so they can pick the portal) and `/portal/dashboard`
 *         otherwise — same routing rule the post-login flow already
 *         follows in LoginForm / RegisterForm.
 *   - Portal-internal widgets (RiskSemaphore, CommandPaletteTrigger,
 *     NewTradeButton) are NOT rendered here. They live in the portal
 *     shell (`PortalShell` + `PortalSidebar`) where they belong;
 *     duplicating them in the public chrome mixed signals. The
 *     Cmd+K/Ctrl+K hotkey listener still mounts so power users can
 *     open the palette from any public page.
 *   - "Cerrar sesión" is also NOT in the public header. The portal
 *     sidebar (`SidebarFooter`) owns that action.
 */
function buildDisplayName(user: { first_name: string; last_name: string; email: string }): string {
  const full = `${user.first_name} ${user.last_name}`.trim();
  return full.length > 0 ? full : user.email;
}

/*
 * Resolve the destination of the "Mi portal" CTA based on the user's
 * role. BOTH-role users land on `/portal-select` so they can pick
 * the portal they want to enter; USER-role users go straight to the
 * user portal dashboard. There is no "mi portal" admin shortcut
 * because admins with role=ADMIN already route through
 * `AdminAuthGuard` and never see the public TopNav authenticated.
 */
function resolvePortalTarget(role: 'USER' | 'ADMIN' | 'BOTH'): string {
  return role === 'BOTH' ? '/portal-select' : '/portal/dashboard';
}

export function TopNav() {
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const { user, loading } = useAuth();
  const isAuthenticated = user !== null;

  // portal-fase0a-base — mount the global Cmd+K / Ctrl+K listener at
  // the top of the tree so every authenticated route can open the
  // palette. The palette itself is rendered below in the same component
  // (Next/dynamic-style lazy via React.lazy in production builds).
  useCommandPaletteHotkey();
  const paletteOpen = useCommandPalette((state) => state.isOpen);

  const displayName = isAuthenticated ? buildDisplayName(user) : null;
  const portalTarget = isAuthenticated ? resolvePortalTarget(user.role) : null;

  return (
    <>
      <header className="sticky top-0 z-40 bg-[rgb(6_11_16_/_0.13)] backdrop-blur-xl backdrop-saturate-150 border-b border-[rgba(0,255,157,0.15)]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-6">
          {/*
           * header-public-auth-aware — the brand stays a Link to `/`
           * for both signed-in and signed-out visitors. The portal
           * shell (`PortalShell`) hides this TopNav on `/portal/*`,
           * so clicking the brand from a public route is always
           * meaningful (it goes to the marketing home).
           */}
          <Link
            to="/"
            data-testid="topnav-brand"
            className="font-display uppercase tracking-[0.2em] text-white text-sm md:text-base flex items-center gap-2 shrink-0"
          >
            <span className="inline-block w-2 h-2 rounded-full bg-primary shadow-[0_0_12px_rgba(0,255,157,0.6)]" />
            JadeCapitalSuite
          </Link>

          {/*
           * header-public-auth-aware — public nav is always rendered
           * (Inicio / Características / Precios / Nosotros). The
           * portal sidebar owns the in-portal nav; the public
           * TopNav keeps its marketing links visible regardless of
           * auth state so a logged-in visitor can still browse
           * pricing/features without bouncing out to the dashboard.
           */}
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
                      // design-system-v1 (Wave 3a, T3a.1) — old-jade rgba swapped for neon jade rgba(0,255,157,*).
                      ? 'font-display tracking-wide text-primary after:content-[""] after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-0.5 after:bg-primary after:shadow-[0_0_8px_rgba(0,255,157,0.8)]'
                      : 'text-text-primary hover:text-primary',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            {!isAuthenticated && !loading ? (
              <div data-testid="topnav-public-cta" className="flex items-center gap-2 md:gap-3">
                <Link
                  to="/register"
                  className="hidden md:inline-flex border-2 border-primary text-primary font-display uppercase tracking-wide px-3 py-1.5 rounded-lg hover:bg-primary hover:text-bg transition-colors text-sm"
                >
                  Registrarse
                </Link>
                <Link
                  to="/login"
                  // design-system-v1 (Wave 3a, T3a.1) — neon jade rgba(0,255,157,0.5) hover shadow.
                  className="inline-flex bg-primary text-bg font-display uppercase tracking-wide px-3 py-1.5 rounded-lg hover:shadow-[0_0_24px_rgba(0,255,157,0.5)] transition-shadow text-sm"
                >
                  Iniciar sesion
                </Link>
              </div>
            ) : null}

            {isAuthenticated && displayName !== null && portalTarget !== null ? (
              <div data-testid="topnav-auth-chrome" className="flex items-center gap-2 md:gap-3">
                <span
                  data-testid="topnav-user-name"
                  className="hidden md:inline text-text-secondary font-body text-sm max-w-[160px] truncate"
                >
                  {displayName}
                </span>
                <Link
                  to={portalTarget}
                  data-testid="topnav-portal-cta"
                  className="inline-flex btn-cyber-jade px-2.5 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg text-xs md:text-sm"
                >
                  Mi portal
                </Link>
              </div>
            ) : null}

            {/*
             * header-public-auth-aware — the mobile burger is shown
             * for BOTH auth states now. The drawer renders the public
             * nav + the auth-appropriate CTA group (Registrarse /
             * Iniciar sesión when signed out; display name + Mi portal
             * when signed in).
             */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
              aria-label="Abrir menu"
              aria-expanded={drawerOpen}
            >
              <span className="block w-5 h-0.5 bg-current relative before:content-[''] before:absolute before:left-0 before:-top-1.5 before:w-5 before:h-0.5 before:bg-current after:content-[''] after:absolute after:left-0 after:top-1.5 after:w-5 before:h-0.5 after:bg-current" />
            </button>
          </div>
        </div>
      </header>

      {drawerOpen ? (
        <TopNavMobileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      ) : null}

      {/*
       * portal-fase0a-base — portal-level mount so the right-side
       * drawer is reachable from any portal route. TopNav already
       * owns this surface, so we keep it next to the mobile drawer
       * sibling rather than threading it through PortalShell.
       */}
      <NewTradeDrawer />
      {paletteOpen ? (
        <Suspense fallback={null}>
          <LazyCommandPalette />
        </Suspense>
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

/*
 * portal-fase0a-base — LazyCommandPalette wrapper.
 *
 * Loaded via React.lazy so the initial bundle doesn't pay for the
 * cmdk dependency until the user actually opens the palette. The
 * lightweight trigger button (CommandPaletteTrigger) is in the
 * critical path; the palette itself is rare.
 */
import { lazy } from 'react';
const LazyCommandPalette = lazy(async () => {
  const mod = await import('../components/common/CommandPalette');
  return { default: mod.CommandPalette };
});
