/*
 * one-by-one-thousand-discipline (PR-2) — WinrateBySessionCard tests.
 *
 * Locks the 4-band + general tile composition (REQ-WRS-006):
 *   1. Renders the 5 tiles (ASIA / LONDON / NEW_YORK / SYDNEY /
 *      general) with integer % labels.
 *   2. Empty bands render the "—" placeholder.
 *   3. Loading state shows skeletons, error state shows the
 *      fallback message.
 *   4. The scope chip only renders when more than one account is
 *      provided.
 *
 * Slice B (sessions-configurable-cap) renamed the legacy
 * EUROPA / NY_AMERICA / NY_PM literals to the four real session
 * names. The fixtures mirror the new payload + new tile testids.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import * as api from '../../../features/dashboard/hooks';
import {
  formatScopeSubtitle,
  resolveScopePeriod,
  WinrateBySessionCard,
} from '../WinrateBySessionCard';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

// Mock shape — bands are already integer-floor(winrate) values. The
// general tile must use the SAME floor formula now (DVC-03):
// 10/18 = 0.555… -> 55% (NOT 56 from a rounded backend summary).
// ``winrate_pct`` on the mock is intentionally set to the expected
// floor value so the partition invariant also holds.
const SAMPLE_RESPONSE = {
  workspace_id: 'w1',
  date_from: '2026-08-01',
  date_to: '2026-09-01',
  account_id: null,
  sessions: {
    ASIA: { trades: 4, wins: 3, winrate_pct: 75 },
    LONDON: { trades: 6, wins: 4, winrate_pct: 67 },
    NEW_YORK: { trades: 5, wins: 2, winrate_pct: 40 },
    SYDNEY: { trades: 3, wins: 1, winrate_pct: 33 },
  },
  general: { trades: 18, wins: 10, winrate_pct: 55 },
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
      expect(screen.getByTestId('session-tile-LONDON')).toHaveTextContent('67%');
      expect(screen.getByTestId('session-tile-NEW_YORK')).toHaveTextContent('40%');
      expect(screen.getByTestId('session-tile-SYDNEY')).toHaveTextContent('33%');
      // GENERAL uses floor(wins/trades*100) — 10/18 = 0.555… -> 55%.
      // The KPI summary strip may use a different fractional formula
      // and produces 55.6% there; the band strip is band-consistent.
      expect(screen.getByTestId('session-tile-general')).toHaveTextContent('55%');
    });
  });

  it('renderiza 81% en General con 52/64 (floor(wins/n*100)), no 80.3%', async () => {
    const resp = {
      ...SAMPLE_RESPONSE,
      general: { trades: 64, wins: 52, winrate_pct: 80 },
    };
    vi.spyOn(api, 'useSessionStats').mockReturnValue({
      data: resp,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.useSessionStats>);

    render(<WinrateBySessionCard workspaceId="w1" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('session-tile-general')).toHaveTextContent(
        '81%',
      );
    });
  });

  it('muestra "Datos en revisión" cuando sum(bandas) != general.trades', async () => {
    // ASIA 24 + 0 + 0 + 0 = 24 — but GENERAL shows 64, the bug from
    // the screenshot. The component MUST surface this rather than
    // silently render a stale-looking tile.
    const resp = {
      ...SAMPLE_RESPONSE,
      sessions: {
        ASIA: { trades: 24, wins: 20, winrate_pct: 83 },
        LONDON: { trades: 0, wins: 0, winrate_pct: 0 },
        NEW_YORK: { trades: 0, wins: 0, winrate_pct: 0 },
        SYDNEY: { trades: 0, wins: 0, winrate_pct: 0 },
      },
      general: { trades: 64, wins: 52, winrate_pct: 81 },
    };
    vi.spyOn(api, 'useSessionStats').mockReturnValue({
      data: resp,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.useSessionStats>);

    render(<WinrateBySessionCard workspaceId="w1" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('winrate-mismatch-note')).toHaveTextContent(
        /Datos en revisi/i,
      );
    });
  });

  it('NO muestra "Datos en revisión" cuando la partición es invariante', async () => {
    // SAMPLE_RESPONSE: 4 + 6 + 5 + 3 = 18 = general.trades. Invariant.
    vi.spyOn(api, 'useSessionStats').mockReturnValue({
      data: SAMPLE_RESPONSE,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.useSessionStats>);

    render(<WinrateBySessionCard workspaceId="w1" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('session-tile-general')).toHaveTextContent('55%');
    });
    expect(screen.queryByTestId('winrate-mismatch-note')).toBeNull();
  });

  it('selector de cuenta controlado: cambia el filtro al cambiar accountId', async () => {
    const useStatsSpy = vi
      .spyOn(api, 'useSessionStats')
      .mockImplementation((filters) => {
        if (filters.accountId === 'a1') {
          return {
            data: {
              ...SAMPLE_RESPONSE,
              account_id: 'a1',
              general: { trades: 6, wins: 5, winrate_pct: 83 },
            },
            isLoading: false,
            isError: false,
            error: null,
          } as unknown as ReturnType<typeof api.useSessionStats>;
        }
        return {
          data: {
            ...SAMPLE_RESPONSE,
            account_id: 'a2',
            general: { trades: 12, wins: 5, winrate_pct: 41 },
          },
          isLoading: false,
          isError: false,
          error: null,
        } as unknown as ReturnType<typeof api.useSessionStats>;
      });

    const { rerender } = render(
      <WinrateBySessionCard
        workspaceId="w1"
        accountId="a1"
        onAccountIdChange={() => undefined}
      />,
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      expect(useStatsSpy).toHaveBeenCalledWith(
        expect.objectContaining({ accountId: 'a1' }),
      );
    });
    expect(screen.getByTestId('session-tile-general')).toHaveTextContent('83%');

    rerender(
      <WinrateBySessionCard
        workspaceId="w1"
        accountId="a2"
        onAccountIdChange={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(useStatsSpy).toHaveBeenCalledWith(
        expect.objectContaining({ accountId: 'a2' }),
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId('session-tile-general')).toHaveTextContent('41%');
    });
  });

  it('modo no controlado: initialAccountId llega al filtro y sobrevive re-renders', async () => {
    const useStatsSpy = vi
      .spyOn(api, 'useSessionStats')
      .mockReturnValue({
        data: { ...SAMPLE_RESPONSE, account_id: 'a-seed' },
        isLoading: false,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof api.useSessionStats>);

    const { rerender } = render(
      <WinrateBySessionCard workspaceId="w1" initialAccountId="a-seed" />,
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      expect(useStatsSpy).toHaveBeenCalledWith(
        expect.objectContaining({ accountId: 'a-seed' }),
      );
    });

    // Re-render with unrelated prop change — the seeded selection
    // must NOT silently flip to null just because parent state
    // changed an unrelated thing.
    rerender(
      <WinrateBySessionCard
        workspaceId="w1"
        initialAccountId="a-seed"
        dateFrom="2026-08-01"
        dateTo="2026-09-01"
      />,
    );

    await waitFor(() => {
      expect(useStatsSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ accountId: 'a-seed' }),
      );
    });
  });

  it('renderiza subtítulo con periodo + zona horaria (default y prop)', async () => {
    vi.spyOn(api, 'useSessionStats').mockReturnValue({
      data: SAMPLE_RESPONSE,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.useSessionStats>);

    render(
      <WinrateBySessionCard
        workspaceId="w1"
        dateFrom="2026-08-20"
        dateTo="2026-09-19"
        timezone="UTC"
      />,
      { wrapper: makeWrapper() },
    );

    const subtitle = screen.getByTestId('winrate-subtitle');
    expect(subtitle).toHaveTextContent(/Asia \/ Londres \/ Nueva York \/ Sídney/);
    expect(subtitle).toHaveTextContent(/Últimos 30 días/);
    expect(subtitle).toHaveTextContent(/UTC/);
  });

  it('muestra 100% cuando una banda no tiene operaciones', async () => {
    // Empty band (trades === 0) must render the literal "100%" so the
    // tile reads as "complete absence of operations" rather than the
    // em-dash placeholder. The "Sin ops" subtitle below the number
    // stays Spanish and unchanged — only the headline percentage is
    // swapped (REQ-WRS-007 follow-up).
    const empty = {
      ...SAMPLE_RESPONSE,
      sessions: {
        ASIA: { trades: 0, wins: 0, winrate_pct: 0 },
        LONDON: { trades: 0, wins: 0, winrate_pct: 0 },
        NEW_YORK: { trades: 0, wins: 0, winrate_pct: 0 },
        SYDNEY: { trades: 0, wins: 0, winrate_pct: 0 },
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
      expect(screen.getByTestId('session-tile-ASIA')).toHaveTextContent('100%');
      expect(screen.getByTestId('session-tile-LONDON')).toHaveTextContent('100%');
      expect(screen.getByTestId('session-tile-NEW_YORK')).toHaveTextContent('100%');
      expect(screen.getByTestId('session-tile-SYDNEY')).toHaveTextContent('100%');
      expect(screen.getByTestId('session-tile-general')).toHaveTextContent('100%');
    });
    // Subtitle "Sin ops" must still render on every empty tile.
    expect(screen.getAllByText('Sin ops').length).toBeGreaterThanOrEqual(5);
  });

  it('NO muestra "Datos en revisión" cuando general.trades > 0 pero las bandas están vacías (periodo genuinamente vacío)', async () => {
    // Partial-empty case: general.trades === 2 with every band trades === 0.
    // Band sum is 0 while general is non-zero — this looks like a
    // partition mismatch, but it is the legitimate "no operations in
    // any visible session" case (e.g. an account that only traded in a
    // retired session slot). The note MUST NOT fire here; instead every
    // tile renders 100% (no ops) and the strip stays band-consistent.
    const partialEmpty = {
      ...SAMPLE_RESPONSE,
      sessions: {
        ASIA: { trades: 0, wins: 0, winrate_pct: 0 },
        LONDON: { trades: 0, wins: 0, winrate_pct: 0 },
        NEW_YORK: { trades: 0, wins: 0, winrate_pct: 0 },
        SYDNEY: { trades: 0, wins: 0, winrate_pct: 0 },
      },
      general: { trades: 2, wins: 1, winrate_pct: 50 },
    };
    vi.spyOn(api, 'useSessionStats').mockReturnValue({
      data: partialEmpty,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.useSessionStats>);

    render(<WinrateBySessionCard workspaceId="w1" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      // Every band tile renders 100% (no operations in any band).
      expect(screen.getByTestId('session-tile-ASIA')).toHaveTextContent('100%');
      expect(screen.getByTestId('session-tile-LONDON')).toHaveTextContent('100%');
      expect(screen.getByTestId('session-tile-NEW_YORK')).toHaveTextContent('100%');
      expect(screen.getByTestId('session-tile-SYDNEY')).toHaveTextContent('100%');
      // GENERAL still renders its own count → 1/2 -> floor(50) = 50%.
      expect(screen.getByTestId('session-tile-general')).toHaveTextContent('50%');
    });
    // The partition-mismatch note must NOT fire for a genuinely empty period.
    expect(screen.queryByTestId('winrate-mismatch-note')).toBeNull();
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

describe('WinrateBySessionCard subtitle helpers', () => {
  // These exercise the pure data path so the period/timezone wiring
  // is covered even when jsdom cannot resolve the browser TZ the way
  // a real client would. The component reads the same helpers.
  it('resolveScopePeriod detecta el rango rolling-30 cuando termina en today', () => {
    expect(resolveScopePeriod('2026-08-20', '2026-09-19', '2026-09-19')).toBe(
      'LAST_30D',
    );
  });

  it('resolveScopePeriod detecta el mes en curso', () => {
    expect(resolveScopePeriod('2026-09-01', '2026-09-19', '2026-09-19')).toBe(
      'CURRENT_MONTH',
    );
  });

  it('resolveScopePeriod detecta el día de hoy', () => {
    expect(resolveScopePeriod('2026-09-19', '2026-09-19', '2026-09-19')).toBe(
      'HOY',
    );
  });

  it('formatScopeSubtitle produce la línea completa en español', () => {
    expect(
      formatScopeSubtitle('2026-08-20', '2026-09-19', 'UTC', '2026-09-19'),
    ).toBe('Asia / Londres / Nueva York / Sídney · Últimos 30 días · UTC');
  });
});