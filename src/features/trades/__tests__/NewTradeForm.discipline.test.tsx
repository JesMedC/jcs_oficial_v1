/*
 * one-by-one-thousand-discipline (PR-2) — NewTradeForm discipline tests.
 *
 * Locks the PR-2 discipline gates:
 *   1. Submit WITHOUT selecting an interest → INTEREST_REQUIRED
 *      error pill, mutation NOT called.
 *   2. The wire payload carries ``interest`` (REQ-INT-001).
 *   3. The "Importe sugerido" pill renders below the discipline
 *      threshold ($1000 capital-inicial proxy) as 'hidden'.
 *   4. Backend discipline error codes map to localized messages.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import * as accountsApi from '../../accounts/api';
import type { AccountList, AccountOut } from '../../accounts/types';
import * as tradesApi from '../api';
import { NewTradeForm } from '../NewTradeForm';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const BASE_ACCOUNT: Omit<AccountOut, 'type'> = {
  id: '00000000-0000-0000-0000-000000000001',
  user_id: 'u1',
  broker_name: 'Pocket',
  name: '1PrimeOption',
  balance_usd: '5000.00', // Above $1000 discipline threshold → Importe sugerido rendered
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
};

const BINARY_ACCOUNT: AccountOut = { ...BASE_ACCOUNT, type: 'BINARY' };

function mockAccounts(items: readonly AccountOut[]) {
  return vi.spyOn(accountsApi, 'listAccountsApi').mockResolvedValue({
    items,
    total: items.length,
    skip: 0,
    limit: 100,
  } satisfies AccountList);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('NewTradeForm — discipline gates (PR-2)', () => {
  it('muestra INTEREST_REQUIRED si se submitea sin interés seleccionado', async () => {
    mockAccounts([BINARY_ACCOUNT]);
    const openSpy = vi.spyOn(tradesApi, 'openTradeApi').mockResolvedValue(
      {} as Awaited<ReturnType<typeof tradesApi.openTradeApi>>,
    );

    render(<NewTradeForm />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('new-trade-submit')).toBeInTheDocument();
    });

    // Pre-notes empty + tags empty → soft-block path triggers.
    fireEvent.click(screen.getByTestId('new-trade-submit'));
    await waitFor(() => {
      expect(screen.getByTestId('soft-block-skip')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('soft-block-skip'));

    // Now the discipline gate fires (no interest selected).
    await waitFor(() => {
      const alert = screen.getByTestId('new-trade-error');
      expect(alert.textContent).toMatch(/INTEREST_REQUIRED/);
      expect(alert.textContent).toMatch(/Elegí el interés/);
    });

    expect(openSpy).not.toHaveBeenCalled();
  });

  it('envía interest en el payload al backend', async () => {
    // Use a sub-$1000 balance so the predictive hard-block stays
    // silent — the discipline gate defers to the legacy balance
    // path below the threshold.
    const lowBalance = { ...BINARY_ACCOUNT, balance_usd: '100.00' };
    mockAccounts([lowBalance]);
    const openSpy = vi.spyOn(tradesApi, 'openTradeApi').mockResolvedValue(
      {} as Awaited<ReturnType<typeof tradesApi.openTradeApi>>,
    );

    render(<NewTradeForm />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('new-trade-submit')).toBeInTheDocument();
    });

    // Pick PLAN interest.
    fireEvent.click(screen.getByTestId('interest-PLAN'));
    // Bypass the journal soft-block.
    fireEvent.click(screen.getByTestId('new-trade-submit'));
    await waitFor(() => {
      expect(screen.getByTestId('soft-block-skip')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('soft-block-skip'));

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalled();
    });

    const sent = openSpy.mock.calls[0]![0] as unknown as Record<string, unknown>;
    expect(sent).toHaveProperty('interest', 'PLAN');
  });

  it('muestra "Importe sugerido" cuando el capital inicial excede $1000', async () => {
    // 5000 * 0.0025 = 12.5 → ceil = 13.
    mockAccounts([BINARY_ACCOUNT]);

    render(<NewTradeForm />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('new-trade-suggested-import')).toBeInTheDocument();
    });
    expect(screen.getByTestId('new-trade-suggested-import')).toHaveTextContent('$13');
  });

  it('mapea códigos de error de disciplina del backend a mensajes localizados', async () => {
    // Sub-$1000 balance so the predictive hard-block stays silent
    // (see discipline.ts — below the threshold the engine defers to
    // the legacy balance gate).
    const lowBalance = { ...BINARY_ACCOUNT, balance_usd: '100.00' };
    mockAccounts([lowBalance]);
    vi.spyOn(tradesApi, 'openTradeApi').mockRejectedValue({
      code: 'CAPITAL_INICIAL_CAP_EXCEEDED',
      message: 'excede el 0.25% del capital inicial (raw)',
      correlation_id: 'corr-abc',
    });

    render(<NewTradeForm />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('new-trade-submit')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('interest-PLAN'));
    fireEvent.click(screen.getByTestId('new-trade-submit'));
    await waitFor(() => {
      expect(screen.getByTestId('soft-block-skip')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('soft-block-skip'));

    await waitFor(() => {
      const alert = screen.getByTestId('new-trade-error');
      expect(alert.textContent).toContain('CAPITAL_INICIAL_CAP_EXCEEDED');
      expect(alert.textContent).toContain('0.25%');
    });
  });
});