/*
 * p0b.1b / p0d.2 / FASE 5 — DashboardPage tests (1 case).
 *
 * FASE 5 stripped the page down to a welcome header + the
 * ``AccountSelector`` (which is hidden when the user has a single
 * account). The old tests that asserted the TRIAL / ACTIVE
 * subscription badges are gone with the dashboard tabs they lived
 * in — the subscription card itself still renders inside
 * ``ConfiguracionPage``, just not here.
 *
 * This file now locks the only behaviour that survived the strip:
 * the greeting uses ``user.first_name`` from the auth context.
 *
 * The QueryClientProvider wrapper is here because ``AccountSelector``
 * mounts ``useAccounts`` (TanStack Query). We mock ``listAccountsApi``
 * so the selector renders nothing (single-account path), which keeps
 * the assertion focused on the heading.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import type { ReactNode } from 'react';

import { AuthContext, type AuthContextValue } from '../../../features/auth/AuthProvider';
import type { AuthMeOut } from '../../../features/auth/types';
import * as accountsApi from '../../../features/accounts/api';
import type { AccountList, AccountOut } from '../../../features/accounts/types';
import { useNewTradeDrawer } from '../../../stores/useNewTradeDrawer';
import { DashboardPage } from '../DashboardPage';

vi.mock('../../../features/subscription/api', async () => {
  return {
    cancelSubscription: vi.fn(),
    upgradeSubscription: vi.fn(),
    getMySubscription: vi.fn(),
  };
});

function buildMe(): AuthMeOut {
  return {
    user_id: 'u1',
    email: 'demo@jadecapital.local',
    first_name: 'Demo',
    last_name: 'User',
    phone: '+54 11 1234 5678',
    role: 'USER',
    workspaces: [],
    current_subscription: null,
    timezone: 'UTC',
  };
}

function mockAccounts(items: readonly AccountOut[]) {
  return vi.spyOn(accountsApi, 'listAccountsApi').mockResolvedValue({
    items,
    total: items.length,
    skip: 0,
    limit: 100,
  } satisfies AccountList);
}

const fakeAccount: AccountOut = {
  id: 'a1',
  user_id: 'u1',
  workspace_id: 'ws-1',
  broker_name: 'Test Broker',
  name: 'Test Account',
  type: 'FOREX',
  balance_usd: '1000.00',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function renderDashboard(user: AuthMeOut | null = null) {
  const value: AuthContextValue = {
    user,
    subscription: user?.current_subscription ?? null,
    loading: false,
    error: null,
    portal: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    setPortal: vi.fn(),
    clearError: vi.fn(),
  };
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <AuthContext.Provider value={value}>
          <DashboardPage />
        </AuthContext.Provider>
      </MemoryRouter>
    </HelmetProvider>,
    { wrapper: makeWrapper() },
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DashboardPage', () => {
  it('greeting uses user.first_name from auth context', () => {
    // Single active account so ``AccountSelector`` short-circuits
    // to null — keeps the assertion focused on the heading.
    mockAccounts([fakeAccount]);
    renderDashboard(buildMe());
    expect(
      screen.getByRole('heading', { level: 1, name: 'Hola, Demo' }),
    ).toBeInTheDocument();
  });

  it('"+ Nuevo trade" CTA renders as an outlined cyan pill (border + text-primary, transparent bg)', () => {
    // Two accounts so the AccountSelector stays mounted — but the CTA
    // contract is independent of the selector's presence.
    mockAccounts([fakeAccount, { ...fakeAccount, id: 'a2', name: 'Second' }]);
    const drawerOpen = vi.fn();
    useNewTradeDrawer.setState({ open: drawerOpen });
    renderDashboard(buildMe());

    const cta = screen.getByTestId('dash-new-trade');
    // dashboard-jarvis-fidelity-v2 — outlined cyan pill uses the
    // exact [#00E5FF] hex tokens (per spec) instead of the
    // previous `border-primary` / `text-primary` indirection.
    expect(cta).toHaveClass('border');
    expect(cta.className).toContain('border-[#00E5FF]');
    expect(cta.className).toContain('text-[#00E5FF]');
    // Opaque fill is gone — outline only.
    expect(cta.className).toContain('bg-transparent');
    expect(cta.className).not.toContain('bg-primary');
    // Hover glow stays so the CTA still reads as primary on hover.
    expect(cta.className).toContain('hover:bg-[rgba(0,229,255,0.1)]');
    expect(cta.className).toContain('hover:shadow-[0_0_15px_rgba(0,229,255,0.5)]');
  });

  it('"+ Nuevo trade" CTA no longer carries the opaque text-bg + bg-primary standalone pair (regression guard)', () => {
    mockAccounts([fakeAccount, { ...fakeAccount, id: 'a2', name: 'Second' }]);
    renderDashboard(buildMe());

    const cta = screen.getByTestId('dash-new-trade');
    // Tokenise the className so `hover:bg-primary/10` doesn't trip
    // a naive substring check — only standalone `bg-primary` /
    // `text-bg` classes are forbidden.
    const tokens = cta.className.split(/\s+/);
    expect(tokens).not.toContain('bg-primary');
    expect(tokens).not.toContain('text-bg');
    // Label text is preserved verbatim.
    expect(cta).toHaveTextContent('+ Nuevo trade');
  });

  it('clicking "+ Nuevo trade" CTA still opens the new-trade drawer (regression)', () => {
    mockAccounts([fakeAccount, { ...fakeAccount, id: 'a2', name: 'Second' }]);
    const drawerOpen = vi.fn();
    useNewTradeDrawer.setState({ open: drawerOpen });
    renderDashboard(buildMe());

    const cta = screen.getByTestId('dash-new-trade');
    cta.click();

    expect(drawerOpen).toHaveBeenCalledTimes(1);
  });

  /*
   * dashboard-jarvis-fidelity (Slice B, T-043, REQ-DHF-005) —
   * H1 greeting MUST upgrade to `text-3xl md:text-4xl` (was
   * `text-2xl md:text-3xl`). The cyan textShadow stays.
   */
  it('T-043: H1 greeting usa text-3xl md:text-4xl y conserva el textShadow cyan', () => {
    mockAccounts([fakeAccount]);
    renderDashboard(buildMe());

    const h1 = screen.getByRole('heading', { level: 1, name: 'Hola, Demo' });
    // Tokenised check so the `md:text-*` variant doesn't trip a
    // naive substring on `text-3xl`.
    const tokens = h1.className.split(/\s+/);
    expect(tokens).toContain('text-3xl');
    expect(tokens).toContain('md:text-4xl');
    // Old size classes are gone.
    expect(tokens).not.toContain('text-2xl');
    expect(tokens).not.toContain('md:text-3xl');
    // Cyan glow preserved.
    expect(h1.getAttribute('style')).toContain('rgba(0,212,216,0.35)');
  });
});