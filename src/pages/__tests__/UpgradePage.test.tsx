/*
 * p0b.1b — UpgradePage tests (2 cases).
 *
 * Covers:
 *   1. renders the two tier cards (Plus + Elite)
 *   2. clicking the Plus CTA calls upgradeSubscription and redirects
 *      to the returned `checkout_url` via window.location.href
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import { AuthContext, type AuthContextValue } from '../../features/auth/AuthProvider';
import * as subApi from '../../features/subscription/api';
import { UpgradePage } from '../UpgradePage';

vi.mock('../../features/subscription/api', async () => {
  return {
    cancelSubscription: vi.fn(),
    upgradeSubscription: vi.fn(),
    getMySubscription: vi.fn(),
  };
});

function renderUpgrade() {
  const value: AuthContextValue = {
    user: null,
    subscription: null,
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
          <UpgradePage />
        </AuthContext.Provider>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe('UpgradePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // jsdom does not actually navigate on `window.location.href = …`.
    // Replace the readonly location with a stub that records the last
    // `href` value so the test can assert on the assigned checkout URL.
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: '', assign: vi.fn(), replace: vi.fn() },
    });
  });

  it('renders the two tier cards (Plus and Elite)', () => {
    renderUpgrade();
    expect(screen.getByRole('heading', { level: 1, name: 'Elige tu plan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Elegir Plus' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Elegir Elite' })).toBeInTheDocument();
  });

  it('calls upgradeSubscription on the Plus CTA click and redirects to checkout_url', async () => {
    const upgradeSpy = vi.spyOn(subApi, 'upgradeSubscription').mockResolvedValue({
      checkout_url: 'https://www.mercadopago.com/checkout/v1/redirect?pref_id=TEST',
      mp_preference_id: 'TEST',
    });

    const user = userEvent.setup();
    renderUpgrade();

    await user.click(screen.getByRole('button', { name: 'Elegir Plus' }));

    await waitFor(() => {
      expect(upgradeSpy).toHaveBeenCalledWith(
        'PLUS',
        expect.objectContaining({
          success: expect.any(String),
          failure: expect.any(String),
          pending: expect.any(String),
        }),
      );
    });
    await waitFor(() => {
      expect(window.location.href).toBe(
        'https://www.mercadopago.com/checkout/v1/redirect?pref_id=TEST',
      );
    });
  });
});
