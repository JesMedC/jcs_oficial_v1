/*
 * portal-fase0a-base — CommandPalette tests.
 *
 * We can't unmarshal cmdk's internal state easily, so the tests
 * focus on:
 *   - the host store flips to closed after Escape
 *   - dispatching an action calls the api adapter
 *   - six navigation actions + 2 actions render in the list
 *
 * cmdk uses cmdk.Command.Item which needs to be visible in the
 * Command.List viewport to be queryable. We ensure open=true so the
 * component actually renders the overlay.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { CommandPalette } from '../CommandPalette';
import { AuthContext, type AuthContextValue } from '../../../features/auth/AuthProvider';
import { useCommandPalette } from '../../../stores/useCommandPalette';
import { useNewTradeDrawer } from '../../../stores/useNewTradeDrawer';

function renderPalette() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const authValue: AuthContextValue = {
    user: null,
    subscription: null,
    loading: false,
    error: null,
    portal: null,
    login: () => Promise.resolve({} as never),
    register: () => Promise.resolve({} as never),
    logout: () => Promise.resolve(),
    refresh: () => Promise.resolve(null),
    setPortal: () => Promise.resolve(),
    clearError: () => undefined,
  };
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter>
          <CommandPalette />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useCommandPalette.setState({ isOpen: true });
  useNewTradeDrawer.setState({ isOpen: false });
});

describe('CommandPalette', () => {
  it('renders six navigation actions + 2 actions when open', async () => {
    renderPalette();
    await waitFor(() => {
      expect(screen.getByTestId('command-palette-root')).toBeInTheDocument();
    });
    const items = await screen.findAllByRole('option');
    expect(items.length).toBeGreaterThanOrEqual(8);
    expect(screen.getByTestId('command-palette-item-nav.dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('command-palette-item-trade.new')).toBeInTheDocument();
    expect(screen.getByTestId('command-palette-item-auth.logout')).toBeInTheDocument();
  });

  it('Escape closes the palette', async () => {
    renderPalette();
    await waitFor(() => {
      expect(screen.getByTestId('command-palette-root')).toBeInTheDocument();
    });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useCommandPalette.getState().isOpen).toBe(false);
  });

  it('Abrir Nuevo Trade action opens the NewTradeDrawer', async () => {
    renderPalette();
    await waitFor(() => {
      expect(screen.getByTestId('command-palette-root')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('command-palette-item-trade.new'));
    expect(useNewTradeDrawer.getState().isOpen).toBe(true);
    expect(useCommandPalette.getState().isOpen).toBe(false);
  });
});
