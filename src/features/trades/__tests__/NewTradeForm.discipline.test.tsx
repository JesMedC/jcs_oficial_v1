/*
 * one-by-one-thousand-discipline (PR-4) — NewTradeForm discipline tests.
 *
 * Locks the PR-4 discipline contract (post Interest-removal, post
 * read-only investment):
 *   1. Submit WITHOUT picking interest → no INTEREST_REQUIRED gate;
 *      the payload goes out without the field and the backend
 *      defaults to "PLAN".
 *   2. The INVERSIÓN USD field renders the calculated amount
 *      (three-tier rule, capped at $404) for any account balance
 *      >= $1. The previous "Máx permitido" pill is gone.
 *   3. Backend discipline error codes still map to localized messages.
 *   4. The wire payload no longer carries ``interest`` (it's optional
 *      on the form).
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
      workspace_id: 'ws-1',
  broker_name: 'Pocket',
  name: '1PrimeOption',
  // PR-4: $5000 > $1000 → tier 3 (0.10%) → calculated investment $5.
  balance_usd: '5000.00',
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
};

const BINARY_ACCOUNT: AccountOut = { ...BASE_ACCOUNT, type: 'BINARY' };

// PR-4: investment_usd is no longer user-typed — it's computed from
// balance. $20000 > $1000 → tier 3 → calculated investment $20.
// The 0.25% ceiling for $20000 is ceil(20000 * 0.0025) = 50, so
// $20 stays comfortably below the predictive hard-block threshold.
const HIGH_BALANCE_ACCOUNT: AccountOut = {
  ...BINARY_ACCOUNT,
  balance_usd: '20000.00',
};

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

describe('NewTradeForm — discipline gates (PR-4)', () => {
  it('ya NO bloquea el submit por INTEREST_REQUIRED (interest es opcional)', async () => {
    // PR-3: the chip selector was removed; the form no longer
    // gates submission on interest. Submitting WITHOUT picking an
    // interest must reach the wire (the backend defaults to "PLAN").
    mockAccounts([HIGH_BALANCE_ACCOUNT]);
    const openSpy = vi.spyOn(tradesApi, 'openTradeApi').mockResolvedValue(
      {} as Awaited<ReturnType<typeof tradesApi.openTradeApi>>,
    );

    render(<NewTradeForm />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('new-trade-submit')).toBeInTheDocument();
    });

    // Pre-notes empty + tags empty → submit goes through directly (the
    // old journal soft-block was removed; an empty journal no longer
    // intercepts the submit cycle).
    fireEvent.click(screen.getByTestId('new-trade-submit'));

    // Mutation must be called, and the payload must NOT include
    // ``interest`` (it's optional on the form).
    await waitFor(() => {
      expect(openSpy).toHaveBeenCalled();
    });
    const sent = openSpy.mock.calls[0]![0] as unknown as Record<string, unknown>;
    expect(sent).not.toHaveProperty('interest');
    // No INTEREST_REQUIRED pill either.
    expect(screen.queryByTestId('new-trade-error')).toBeNull();
  });

  it('muestra $5 en el campo INVERSIÓN USD con balance de $5000 (PR-4 tres tiers)', async () => {
    // PR-4: investment_usd is now a derived read-only display.
    // Balance $5000 > $1000 → tier 3 (0.10% rule) → ceil(5000 ×
    // 0.001) = 5. The previous PR-3 pill showed $13 here under the
    // old single-tier 0.25% rule; the three-tier rule produces $5.
    mockAccounts([BINARY_ACCOUNT]);

    render(<NewTradeForm />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('new-trade-investment')).toBeInTheDocument();
    });
    expect(screen.getByTestId('new-trade-investment').textContent).toBe('$5');
    // Pill is gone — the field IS the canonical display.
    expect(screen.queryByTestId('new-trade-suggested-import')).toBeNull();
  });

  it('mapea códigos de error de disciplina del backend a mensajes localizados', async () => {
    // PR-4: balance $20000 > $1000 → calculated investment $20
    // (tier 3, 0.10%). The 0.25% ceiling at $20000 is $50, so the
    // predictive hard-block stays silent and the request reaches
    // the wire — letting us verify the backend-error-to-Spanish
    // mapper with the canonical CAPITAL_INICIAL_CAP_EXCEEDED code.
    const highBalance = { ...BINARY_ACCOUNT, balance_usd: '20000.00' };
    mockAccounts([highBalance]);
    vi.spyOn(tradesApi, 'openTradeApi').mockRejectedValue({
      code: 'CAPITAL_INICIAL_CAP_EXCEEDED',
      message: 'excede el 0.25% del capital inicial (raw)',
      correlation_id: 'corr-abc',
    });

    render(<NewTradeForm />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('new-trade-submit')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('new-trade-submit'));

    await waitFor(() => {
      const alert = screen.getByTestId('new-trade-error');
      expect(alert.textContent).toContain('CAPITAL_INICIAL_CAP_EXCEEDED');
      expect(alert.textContent).toContain('0.25%');
    });
  });
});
