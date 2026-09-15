/*
 * one-by-one-thousand-discipline (PR-2) — DiarioPage test.
 *
 * DiarioPage used to be a stub; PR-2 mounts ``PnLCalendar`` as the
 * body of the page. We verify:
 *   1. The page renders the H1 + PnLCalendar mount testids when
 *      AuthContext supplies a workspace id.
 *   2. The fallback "Necesitás un workspace activo" renders when
 *      AuthContext is missing.
 *
 * FASE 6 added an AccountSelector on top; the page now also reads
 * ``useAccounts`` (TanStack Query), so each render is wrapped in a
 * QueryClientProvider just like the rest of the portal.
 */
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import * as apiHooks from '../../../features/dashboard/hooks';
import { DiarioPage } from '../DiarioPage';
import { AuthContext, type AuthContextValue } from '../../../features/auth/AuthProvider';
import type { AuthMeOut } from '../../../features/auth/types';

function makeAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  const base: AuthMeOut = {
    user_id: 'u1',
    email: 'j@d.com',
    first_name: 'Jane',
    last_name: 'Doe',
    phone: '+54',
    role: 'USER',
    workspaces: [{ id: 'w1', name: 'WS1', plan_tier: 'NONE', role_in_workspace: 'OWNER', created_at: '2026-01-01T00:00:00.000Z', session_ops_cap: null }],
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

describe('DiarioPage', () => {
  it('monta el PnLCalendar cuando auth provee workspaceId', () => {
    vi.spyOn(apiHooks, 'usePnLCalendar').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof apiHooks.usePnLCalendar>);

    render(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <AuthContext.Provider value={makeAuthValue()}>
            <DiarioPage />
          </AuthContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /Calendario P&L/i })).toBeInTheDocument();
    expect(screen.getByTestId('pnl-calendar')).toBeInTheDocument();
  });

  it('muestra fallback cuando auth no provee workspace', () => {
    vi.spyOn(apiHooks, 'usePnLCalendar').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof apiHooks.usePnLCalendar>);

    render(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <AuthContext.Provider value={makeAuthValue({ user: null })}>
            <DiarioPage />
          </AuthContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Necesitás un workspace activo/i)).toBeInTheDocument();
  });

  it('muestra fallback cuando AuthContext está ausente (defensive)', () => {
    vi.spyOn(apiHooks, 'usePnLCalendar').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof apiHooks.usePnLCalendar>);

    render(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <DiarioPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Necesitás un workspace activo/i)).toBeInTheDocument();
  });
});