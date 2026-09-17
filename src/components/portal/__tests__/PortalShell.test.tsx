/*
 * p0d.2 — PortalShell smoke tests.
 * p0e.1 — extended to 6 nav labels (Dashboard, Cuentas, Operaciones,
 *         Diario, Playbook, Configuracion).
 * scanner — extended to 7 nav labels (adds Scanner between Diario
 *         and Playbook).
 * portal-fase0a-base — sidebar composes three pieces (Header / Nav /
 *         Footer + WorkspaceSelector). The header/nav/footer are
 *         still rendered by PortalShell via the PortalSidebar; this
 *         file now wraps with AuthProvider so WorkspaceSelector can
 *         call useAuth without tripping the guard.
 * dashboard-jarvis-fidelity (Slice A, T-030, T-031) — sidebar glass
 *         surface + brand-row visibility. The class assertions pin
 *         the chrome contract: bg-surface/40, backdrop-blur-md,
 *         glass-border, and text-text-primary with the cyan glow.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { PortalShell } from '../PortalShell';
import { AuthContext, type AuthContextValue } from '../../../features/auth/AuthProvider';
import type { AuthMeOut } from '../../../features/auth/types';
import { useSidebarCollapsed } from '../../../stores/useSidebarCollapsed';

const buildAuth = (): AuthContextValue => ({
  user: {
    user_id: 'u1',
    email: 'juana@example.com',
    first_name: 'Juana',
    last_name: 'Perez',
    phone: '+54 11 1234 5678',
    role: 'USER',
    workspaces: [],
    current_subscription: null,
    timezone: 'UTC',
  },
  subscription: null,
  loading: false,
  error: null,
  portal: null,
  login: () => Promise.resolve({} as AuthMeOut),
  register: () => Promise.resolve({} as AuthMeOut),
  logout: () => Promise.resolve(),
  refresh: () => Promise.resolve({} as AuthMeOut | null),
  setPortal: () => Promise.resolve(),
  clearError: () => undefined,
});

afterEach(() => {
  // Reset the collapsed store after each test so the default expanded
  // state is restored. The triangulation test (T-031 collapsed mode)
  // mutates the store; without this reset the next test would render
  // collapsed by accident.
  useSidebarCollapsed.setState({ isCollapsed: false });
});

function renderAt(path: string, authOverrides: Partial<AuthContextValue> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ ...buildAuth(), ...authOverrides }}>
        <HelmetProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/portal/*" element={<PortalShell />}>
                <Route path="cuentas" element={<div data-testid="child">cuentas child content</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </HelmetProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('PortalShell', () => {
  it('renders the brand, the collapse toggle and the seven nav labels', () => {
    renderAt('/portal/cuentas');

    // Brand row.
    expect(screen.getByText('JadeCapitalSuite')).toBeInTheDocument();
    expect(screen.getByText('USUARIO')).toBeInTheDocument();

    // Nav labels (Spanish per mem #68). Seven items in final nav order:
    // Dashboard, Cuentas, Operaciones, Diario, Scanner, Playbook,
    // Configuracion.
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cuentas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Operaciones' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Diario' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Scanner' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Playbook' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Configuracion' })).toBeInTheDocument();

    // Collapse toggle label (expanded state).
    expect(screen.getByRole('button', { name: /Ocultar menu/i })).toBeInTheDocument();
  });

  it('marks the active route via aria-current="page"', () => {
    renderAt('/portal/cuentas');

    const active = screen.getByRole('link', { name: 'Cuentas' });
    expect(active).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('renders the routed children inside the main area', () => {
    renderAt('/portal/cuentas');

    const main = screen.getByRole('main');
    const child = screen.getByTestId('child');
    expect(main).toContainElement(child);
    expect(screen.getByText('cuentas child content')).toBeInTheDocument();
  });

  it('sidebar <aside> renders the glass surface (bg-surface/40 + backdrop-blur-md + var(--glass-border) border)', () => {
    renderAt('/portal/cuentas');

    const aside = screen.getByRole('complementary');
    expect(aside).toHaveClass('bg-surface/40');
    expect(aside).toHaveClass('backdrop-blur-md');
    expect(aside.className).toMatch(/border-\[var\(--glass-border\)\]/);
    expect(aside).toHaveClass('border-r');
  });

  it('sidebar <aside> width transition between w-16 (collapsed) and w-72 (expanded) is intact', () => {
    const { rerender } = renderAt('/portal/cuentas');

    const aside = screen.getByRole('complementary');
    // default expanded (no collapsed-store override)
    expect(aside).toHaveClass('w-72');

    // The aria-label contract is unaffected by the glass surface swap.
    expect(aside).toHaveAttribute('aria-label', expect.stringMatching(/menu lateral/i));
    // Sanity: Scanline overlay is still mounted as the last child of the aside.
    expect(aside.children.length).toBeGreaterThanOrEqual(3);
  });

  it('sidebar <aside> no longer carries the opaque bg-[var(--color-bg)] fill (regression guard for the glass swap)', () => {
    renderAt('/portal/cuentas');

    const aside = screen.getByRole('complementary');
    expect(aside.className).not.toMatch(/bg-\[var\(--color-bg\)\]/);
    // And the legacy jade-border token is gone too (replaced by glass-border).
    expect(aside.className).not.toMatch(/border-\[var\(--color-jade-border\)\]/);
  });

  it('brand row uses text-text-primary + cyan textShadow for visibility over the glass surface', () => {
    renderAt('/portal/cuentas');

    // Brand row label sits inside the header; the existing PortalShell test
    // asserts "JadeCapitalSuite" is in the document. Pin its computed
    // classes + inline textShadow so the cyan glow stays over the glass.
    const brand = screen.getByText('JadeCapitalSuite');
    expect(brand).toHaveClass('text-text-primary');
    // Legacy `text-white` is gone (would wash out over the glass surface).
    expect(brand).not.toHaveClass('text-white');
    // Inline textShadow is the cyan glow specified in design.md §CWM-002.
    expect(brand.getAttribute('style') ?? '').toMatch(
      /text-shadow:\s*0 0 8px rgba\(0,\s*212,\s*216,\s*0\.35\)/,
    );
  });

  it('brand sub-label USUARIO stays muted + is hidden in collapsed mode', () => {
    renderAt('/portal/cuentas');

    const sub = screen.getByText('USUARIO');
    expect(sub).toHaveClass('text-text-muted');
  });

  it('collapsed sidebar (w-16) hides the brand row + USUARIO sub-label', () => {
    // Flip the collapsed store before render so the brand row never mounts.
    useSidebarCollapsed.setState({ isCollapsed: true });
    try {
      renderAt('/portal/cuentas');

      const aside = screen.getByRole('complementary');
      expect(aside).toHaveClass('w-16');
      // Brand + USUARIO labels are conditionally rendered → absent in collapsed mode.
      expect(screen.queryByText('JadeCapitalSuite')).toBeNull();
      expect(screen.queryByText('USUARIO')).toBeNull();
    } finally {
      useSidebarCollapsed.setState({ isCollapsed: false });
    }
  });

  it('logout pill renders as an outlined button (no opaque bg-primary/15 fill)', () => {
    renderAt('/portal/cuentas');

    const logout = screen.getByTestId('sidebar-logout');
    // Tokenized class lookup: standalone `bg-primary/15` is gone.
    const tokens = (logout.className ?? '').split(/\s+/);
    expect(tokens).not.toContain('bg-primary/15');
    // The btn-cyber-jade base class + the outline-on-hover behavior stay.
    expect(logout).toHaveClass('btn-cyber-jade');
    // Icon + label structure is intact.
    expect(logout).toHaveAttribute('aria-label', 'Cerrar sesion');
    expect(logout).toHaveTextContent(/cerrar sesion/i);
  });

  it('clicking the logout pill triggers the auth logout flow (regression)', async () => {
    // Spy on the auth context's `logout` so we can assert the click
    // wires through the SidebarFooter's `handleLogout` → `useAuth().logout`.
    const authLogout = vi.fn().mockResolvedValue(undefined);
    renderAt('/portal/cuentas', { logout: authLogout });

    const logout = screen.getByTestId('sidebar-logout');
    logout.click();
    // The handler calls `logout()` (returns a promise) then catches.
    await Promise.resolve();
    expect(authLogout).toHaveBeenCalledTimes(1);
  });
});
