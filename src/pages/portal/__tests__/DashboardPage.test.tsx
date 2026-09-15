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
});