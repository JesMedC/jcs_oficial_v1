/*
 * p0d.2 — PortalShell smoke tests.
 * p0e.1 — extended to 6 nav labels (Dashboard, Cuentas, Operaciones,
 *         Diario, Playbook, Configuracion); Movimientos was renamed
 *         to Operaciones and Diario + Playbook were added.
 *
 * Covers the three things the spec demands from the shell:
 *   1. All 6 nav labels render (Dashboard, Cuentas, Operaciones,
 *      Diario, Playbook, Configuracion) and the brand row shows
 *      "USUARIO".
 *   2. The NavLink for the active route gets aria-current="page".
 *   3. The main area renders the routed children (PortalShell's
 *      <Outlet /> works).
 *
 * Pattern mirrors the AdminSidebar test: MemoryRouter + HelmetProvider
 * wrapped around the shell so NavLink and Helmet hooks find their
 * contexts without a full app bootstrap.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import { PortalShell } from '../PortalShell';

function renderAt(path: string) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/portal/*" element={<PortalShell />}>
            <Route path="cuentas" element={<div data-testid="child">cuentas child content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe('PortalShell', () => {
  it('renders the brand, the collapse toggle and the six nav labels', () => {
    renderAt('/portal/cuentas');

    // Brand row.
    expect(screen.getByText('JadeCapitalSuite')).toBeInTheDocument();
    expect(screen.getByText('USUARIO')).toBeInTheDocument();

    // Nav labels (Spanish per mem #68). Six items in final nav order:
    // Dashboard, Cuentas, Operaciones, Diario, Playbook, Configuracion.
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cuentas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Operaciones' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Diario' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Playbook' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Configuracion' })).toBeInTheDocument();

    // Collapse toggle label (expanded state).
    expect(screen.getByRole('button', { name: /Colapsar menu/i })).toBeInTheDocument();
  });

  it('marks the active route via aria-current="page"', () => {
    renderAt('/portal/cuentas');

    const active = screen.getByRole('link', { name: 'Cuentas' });
    expect(active).toHaveAttribute('aria-current', 'page');

    // Sibling links must NOT be marked as active.
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Operaciones' })).not.toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Diario' })).not.toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Playbook' })).not.toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Configuracion' })).not.toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('renders the routed children inside the main area', () => {
    renderAt('/portal/cuentas');

    // The child rendered via Outlet sits inside a <main> element.
    const main = screen.getByRole('main');
    const child = screen.getByTestId('child');
    expect(main).toContainElement(child);
    expect(screen.getByText('cuentas child content')).toBeInTheDocument();
  });
});
