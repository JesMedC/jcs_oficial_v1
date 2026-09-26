import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import * as apiHooks from '../../../features/dashboard/hooks';
import { useAccounts } from '../../../features/accounts/hooks';
import { useTradesAll } from '../../../features/trades/useTradesAll';
import { DiarioPage } from '../DiarioPage';
import { AuthContext, type AuthContextValue } from '../../../features/auth/AuthProvider';
import type { AuthMeOut } from '../../../features/auth/types';

vi.mock('../../../features/accounts/hooks', () => ({
  useAccounts: vi.fn(),
}));

vi.mock('../../../features/trades/useTradesAll', () => ({
  useTradesAll: vi.fn(),
}));

const mockUseAccounts = vi.mocked(useAccounts);
const mockUseTradesAll = vi.mocked(useTradesAll);

function makeAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  const base: AuthMeOut = {
    user_id: 'u1',
    email: 'j@d.com',
    first_name: 'Jane',
    last_name: 'Doe',
    phone: '+54',
    role: 'USER',
    workspaces: [
      {
        id: 'w1',
        name: 'WS1',
        plan_tier: 'NONE',
        role_in_workspace: 'OWNER',
        created_at: '2026-01-01T00:00:00.000Z',
        risk_control_mode: 'operations',
        session_ops_cap: null,
        daily_loss_pct: null,
        weekly_loss_pct: null,
        monthly_loss_pct: null,
      },
    ],
    current_subscription: null,
    timezone: 'UTC',
  };
  return {
    user: base,
    subscription: null,
    loading: false,
    error: null,
    portal: 'user',
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    setPortal: vi.fn(),
    clearError: vi.fn(),
    ...overrides,
  };
}

function renderPage(authValue: AuthContextValue | null = makeAuthValue()) {
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        {authValue ? (
          <AuthContext.Provider value={authValue}>
            <DiarioPage />
          </AuthContext.Provider>
        ) : (
          <DiarioPage />
        )}
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

function mockCalendarDependencies({ withAccount = true }: { withAccount?: boolean } = {}) {
  vi.spyOn(apiHooks, 'usePnLCalendar').mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
  } as unknown as ReturnType<typeof apiHooks.usePnLCalendar>);

  mockUseAccounts.mockReturnValue({
    data: withAccount
      ? {
          items: [
            {
              id: 'a1',
              user_id: 'u1',
              workspace_id: 'w1',
              broker_name: 'Broker',
              type: 'FOREX',
              name: 'Cuenta principal',
              balance_usd: '1000.00',
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-01T00:00:00.000Z',
            },
          ],
          total: 1,
          skip: 0,
          limit: 100,
        }
      : { items: [], total: 0, skip: 0, limit: 100 },
    isFetching: false,
  } as unknown as ReturnType<typeof useAccounts>);

  mockUseTradesAll.mockReturnValue({
    trades: [],
    isLoading: false,
    isError: false,
    closedCount: 0,
    openCount: 0,
    totalPnl: 0,
  });
}

describe('DiarioPage', () => {
  it('monta el PnLCalendar cuando auth provee workspaceId', () => {
    mockCalendarDependencies();

    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: /Calendario P&L/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Cuenta principal/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId('pnl-calendar')).toBeInTheDocument();
  });

  it('muestra fallback cuando auth no provee workspace', () => {
    mockCalendarDependencies({ withAccount: false });

    renderPage(makeAuthValue({ user: null }));

    expect(screen.getByText(/Necesitás un workspace activo/i)).toBeInTheDocument();
  });

  it('muestra fallback cuando AuthContext está ausente (defensive)', () => {
    mockCalendarDependencies({ withAccount: false });

    renderPage(null);

    expect(screen.getByText(/Necesitás un workspace activo/i)).toBeInTheDocument();
  });
});
