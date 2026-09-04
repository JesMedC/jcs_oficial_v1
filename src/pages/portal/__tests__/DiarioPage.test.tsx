/*
 * one-by-one-thousand-discipline (PR-2) — DiarioPage test.
 *
 * DiarioPage used to be a stub; PR-2 mounts ``PnLCalendar`` as the
 * body of the page. We verify:
 *   1. The page renders the H1 + PnLCalendar mount testids when
 *      AuthContext supplies a workspace id.
 *   2. The fallback "Necesitás un workspace activo" renders when
 *      AuthContext is missing.
 */
import { render, screen } from '@testing-library/react';
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
    workspaces: [{ id: 'w1', name: 'WS1', plan_tier: 'NONE', role_in_workspace: 'OWNER', created_at: '2026-01-01T00:00:00.000Z' }],
    current_subscription: null,
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
        <AuthContext.Provider value={makeAuthValue()}>
          <DiarioPage />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /Diario/i })).toBeInTheDocument();
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
        <AuthContext.Provider value={makeAuthValue({ user: null })}>
          <DiarioPage />
        </AuthContext.Provider>
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
        <DiarioPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Necesitás un workspace activo/i)).toBeInTheDocument();
  });
});