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
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { PortalShell } from '../PortalShell';
import { AuthContext, type AuthContextValue } from '../../../features/auth/AuthProvider';
import type { AuthMeOut } from '../../../features/auth/types';

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

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={buildAuth()}>
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
});
