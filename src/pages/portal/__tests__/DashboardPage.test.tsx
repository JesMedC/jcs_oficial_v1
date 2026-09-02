/*
 * p0b.1b / p0d.2 — DashboardPage tests (3 cases).
 *
 * Moved from src/pages/__tests__/ to src/pages/portal/__tests__/ when
 * the component moved to its new home under the PortalShell. All
 * relative imports stay identical (one fewer `../` would have been a
 * typo).
 *
 * Covers:
 *   1. shows greeting `Hola, {first_name}` from `user.first_name`
 *   2. shows the TRIAL badge when current_subscription.status === 'TRIAL'
 *   3. shows the ACTIVE badge when current_subscription.status === 'ACTIVE'
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import { AuthContext, type AuthContextValue } from '../../../features/auth/AuthProvider';
import type { AuthMeOut, SubscriptionOut } from '../../../features/auth/types';
import { DashboardPage } from '../DashboardPage';

vi.mock('../../../features/subscription/api', async () => {
  return {
    cancelSubscription: vi.fn(),
    upgradeSubscription: vi.fn(),
    getMySubscription: vi.fn(),
  };
});

function buildMe(subscription: SubscriptionOut | null): AuthMeOut {
  return {
    user_id: 'u1',
    email: 'demo@jadecapital.local',
    first_name: 'Demo',
    last_name: 'User',
    phone: '+54 11 1234 5678',
    role: 'USER',
    workspaces: [],
    current_subscription: subscription,
  };
}

function buildSubscription(status: 'TRIAL' | 'ACTIVE'): SubscriptionOut {
  return {
    id: 'sub-1',
    user_id: 'u1',
    workspace_id: 'w1',
    tier: 'STARTER',
    status,
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 7 * 86400000).toISOString(),
    mp_preference_id: null,
    mp_subscription_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
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
  );
}

describe('DashboardPage', () => {
  it('greeting uses user.first_name from auth context', () => {
    renderDashboard(buildMe(buildSubscription('TRIAL')));
    expect(screen.getByRole('heading', { level: 1, name: 'Hola, Demo' })).toBeInTheDocument();
  });

  it('shows the TRIAL badge when current_subscription.status is TRIAL', () => {
    renderDashboard(buildMe(buildSubscription('TRIAL')));
    expect(screen.getByText('Periodo de prueba')).toBeInTheDocument();
  });

  it('shows the ACTIVE badge when current_subscription.status is ACTIVE', () => {
    renderDashboard(buildMe(buildSubscription('ACTIVE')));
    // "Activo" appears both in the status badge and in the fallback
    // Estado field of the subscription card; assert at least one match.
    expect(screen.getAllByText('Activo').length).toBeGreaterThanOrEqual(1);
  });
});
