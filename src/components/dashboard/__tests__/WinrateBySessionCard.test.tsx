/*
 * one-by-one-thousand-discipline (PR-2) — WinrateBySessionCard tests.
 *
 * Locks the 4-band + general tile composition (REQ-WRS-006):
 *   1. Renders the 5 tiles (ASIA / EUROPA / NY_AMERICA / NY_PM /
 *      general) with integer % labels.
 *   2. Empty bands render the "—" placeholder.
 *   3. Loading state shows skeletons, error state shows the
 *      fallback message.
 *   4. The scope chip only renders when more than one account is
 *      provided.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import * as api from '../../../features/dashboard/hooks';
import { WinrateBySessionCard } from '../WinrateBySessionCard';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const SAMPLE_RESPONSE = {
  workspace_id: 'w1',
  date_from: '2026-08-01',
  date_to: '2026-09-01',
  account_id: null,
  sessions: {
    ASIA: { trades: 4, wins: 3, winrate_pct: 75 },
    EUROPA: { trades: 6, wins: 4, winrate_pct: 67 },
    NY_AMERICA: { trades: 5, wins: 2, winrate_pct: 40 },
    NY_PM: { trades: 3, wins: 1, winrate_pct: 33 },
  },
  general: { trades: 18, wins: 10, winrate_pct: 56 },
};

describe('WinrateBySessionCard', () => {
  it('renderiza las 4 bandas + general con labels enteros', async () => {
    vi.spyOn(api, 'useSessionStats').mockReturnValue({
      data: SAMPLE_RESPONSE,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.useSessionStats>);

    render(
      <WinrateBySessionCard
        workspaceId="w1"
        dateFrom="2026-08-01"
        dateTo="2026-09-01"
      />,
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      expect(screen.getByTestId('session-tile-ASIA')).toHaveTextContent('75%');
      expect(screen.getByTestId('session-tile-EUROPA')).toHaveTextContent('67%');
      expect(screen.getByTestId('session-tile-NY_AMERICA')).toHaveTextContent('40%');
      expect(screen.getByTestId('session-tile-NY_PM')).toHaveTextContent('33%');
      expect(screen.getByTestId('session-tile-general')).toHaveTextContent('56%');
    });
  });

  it('muestra "—" cuando una banda no tiene operaciones', async () => {
    const empty = {
      ...SAMPLE_RESPONSE,
      sessions: {
        ASIA: { trades: 0, wins: 0, winrate_pct: 0 },
        EUROPA: { trades: 0, wins: 0, winrate_pct: 0 },
        NY_AMERICA: { trades: 0, wins: 0, winrate_pct: 0 },
        NY_PM: { trades: 0, wins: 0, winrate_pct: 0 },
      },
      general: { trades: 0, wins: 0, winrate_pct: 0 },
    };
    vi.spyOn(api, 'useSessionStats').mockReturnValue({
      data: empty,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.useSessionStats>);

    render(<WinrateBySessionCard workspaceId="w1" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('session-tile-ASIA')).toHaveTextContent('—');
      expect(screen.getByTestId('session-tile-EUROPA')).toHaveTextContent('—');
      expect(screen.getByTestId('session-tile-NY_AMERICA')).toHaveTextContent('—');
      expect(screen.getByTestId('session-tile-NY_PM')).toHaveTextContent('—');
      expect(screen.getByTestId('session-tile-general')).toHaveTextContent('—');
    });
  });

  it('muestra skeletons durante la carga', () => {
    vi.spyOn(api, 'useSessionStats').mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.useSessionStats>);

    render(<WinrateBySessionCard workspaceId="w1" />, { wrapper: makeWrapper() });

    expect(screen.getByTestId('winrate-loading')).toBeInTheDocument();
    // Skeletons still expose the tile testids so the layout doesn't
    // shift when data arrives.
    expect(screen.getByTestId('session-tile-ASIA')).toBeInTheDocument();
    expect(screen.getByTestId('session-tile-general')).toBeInTheDocument();
  });

  it('muestra fallback legible cuando el fetch falla', () => {
    vi.spyOn(api, 'useSessionStats').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('boom'),
    } as unknown as ReturnType<typeof api.useSessionStats>);

    render(<WinrateBySessionCard workspaceId="w1" />, { wrapper: makeWrapper() });

    expect(screen.getByTestId('winrate-error')).toHaveTextContent(
      /No pudimos cargar el winrate/i,
    );
  });

  it('oculta el chip de alcance cuando hay una sola cuenta', () => {
    vi.spyOn(api, 'useSessionStats').mockReturnValue({
      data: SAMPLE_RESPONSE,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.useSessionStats>);

    render(
      <WinrateBySessionCard
        workspaceId="w1"
        availableAccounts={[{ id: 'a1', name: 'Pocket' }]}
      />,
      { wrapper: makeWrapper() },
    );

    expect(screen.queryByTestId('winrate-account-scope')).toBeNull();
  });

  it('muestra el chip de alcance cuando hay 2+ cuentas', () => {
    vi.spyOn(api, 'useSessionStats').mockReturnValue({
      data: SAMPLE_RESPONSE,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.useSessionStats>);

    render(
      <WinrateBySessionCard
        workspaceId="w1"
        availableAccounts={[
          { id: 'a1', name: 'Pocket' },
          { id: 'a2', name: 'Forex' },
        ]}
      />,
      { wrapper: makeWrapper() },
    );

    expect(screen.getByTestId('winrate-account-scope')).toBeInTheDocument();
  });
});