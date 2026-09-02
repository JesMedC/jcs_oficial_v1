/*
 * portal-fase0a-base — NewTradeForm discriminated-union tests.
 *
 * Locks the BINARY vs FOREX branch contract that the original bug
 * broke. The bug: `direction` was hardcoded to 'LONG' in
 * ``defaultValues`` regardless of the account type, so a BINARY
 * first-account opened the form with ``type: 'BINARY'`` +
 * ``direction: 'LONG'``. The BINARY branch's select rendered
 * CALL/PUT but the form state held 'LONG', so Zod (and the backend)
 * rejected the submission with
 * ``Invalid enum value. Expected 'CALL' | 'PUT', received 'LONG'``.
 *
 * Cases:
 *   1. BINARY account → direction select renders CALL/PUT (Compra/Venta)
 *      and never LONG/SHORT.
 *   2. FOREX account → direction select renders LONG/SHORT and never
 *      CALL/PUT.
 *   3. BINARY account → expiration is a <select> with the broker
 *      presets 1/2/3/4/5/10/15 min (60/120/180/240/300/600/900 sec).
 *   4. FOREX account → no expiration field is rendered (BINARY-only).
 *   5. Switching account from BINARY → FOREX → BINARY resets
 *      ``direction`` to the type-correct default so stale enum
 *      values never leak across branches.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import * as accountsApi from '../../accounts/api';
import type { AccountList, AccountOut } from '../../accounts/types';
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
  balance_usd: '100.00',
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
};

const BINARY_ACCOUNT: AccountOut = { ...BASE_ACCOUNT, type: 'BINARY' };
const FOREX_ACCOUNT: AccountOut = {
  ...BASE_ACCOUNT,
  id: '00000000-0000-0000-0000-000000000002',
  type: 'FOREX',
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

describe('NewTradeForm — discriminated BINARY vs FOREX', () => {
  it('muestra opciones CALL/PUT (Compra/Venta) para cuenta BINARY', async () => {
    mockAccounts([BINARY_ACCOUNT]);
    render(<NewTradeForm />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('new-trade-account')).toBeInTheDocument();
      expect(screen.getByTestId('new-trade-direction')).toBeInTheDocument();
    });

    const directionSelect = screen.getByTestId('new-trade-direction') as HTMLSelectElement;
    const optionValues = Array.from(directionSelect.querySelectorAll('option')).map(
      (o) => o.value,
    );
    expect(optionValues).toEqual(expect.arrayContaining(['CALL', 'PUT']));
    expect(optionValues).not.toContain('LONG');
    expect(optionValues).not.toContain('SHORT');

    const labels = Array.from(directionSelect.querySelectorAll('option')).map(
      (o) => o.textContent,
    );
    expect(labels).toEqual(expect.arrayContaining(['Compra', 'Venta']));
  });

  it('muestra opciones LONG/SHORT (Long/Short) para cuenta FOREX', async () => {
    mockAccounts([FOREX_ACCOUNT]);
    render(<NewTradeForm />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('new-trade-account')).toBeInTheDocument();
      expect(screen.getByTestId('new-trade-direction')).toBeInTheDocument();
    });

    const directionSelect = screen.getByTestId('new-trade-direction') as HTMLSelectElement;
    const optionValues = Array.from(directionSelect.querySelectorAll('option')).map(
      (o) => o.value,
    );
    expect(optionValues).toEqual(expect.arrayContaining(['LONG', 'SHORT']));
    expect(optionValues).not.toContain('CALL');
    expect(optionValues).not.toContain('PUT');
  });

  it('muestra desplegable de expiracion con valores 1/2/3/4/5/10/15 min para BINARY', async () => {
    mockAccounts([BINARY_ACCOUNT]);
    render(<NewTradeForm />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('new-trade-expiration')).toBeInTheDocument();
    });

    const expirationSelect = screen.getByTestId('new-trade-expiration') as HTMLSelectElement;
    const labels = Array.from(expirationSelect.querySelectorAll('option')).map(
      (o) => o.textContent,
    );
    expect(labels).toEqual(['1 min', '2 min', '3 min', '4 min', '5 min', '10 min', '15 min']);

    const values = Array.from(expirationSelect.querySelectorAll('option')).map((o) =>
      Number(o.value),
    );
    expect(values).toEqual([60, 120, 180, 240, 300, 600, 900]);
  });

  it('no muestra el campo expiracion para cuenta FOREX', async () => {
    mockAccounts([FOREX_ACCOUNT]);
    render(<NewTradeForm />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('new-trade-account')).toBeInTheDocument();
      expect(screen.getByTestId('new-trade-direction')).toBeInTheDocument();
    });

    // Expiration field is BINARY-only.
    expect(screen.queryByTestId('new-trade-expiration')).toBeNull();
  });

  it('al cambiar de FOREX a BINARY resetea direction de LONG a CALL', async () => {
    mockAccounts([BINARY_ACCOUNT, FOREX_ACCOUNT]);
    render(<NewTradeForm />, { wrapper: makeWrapper() });

    const accountSelect = await screen.findByTestId('new-trade-account') as HTMLSelectElement;
    await screen.findByTestId('new-trade-direction');

    // First account is BINARY → direction default is CALL.
    await waitFor(() => {
      expect(
        (screen.getByTestId('new-trade-direction') as HTMLSelectElement).value,
      ).toBe('CALL');
    });

    // Switch to FOREX → direction resets to LONG. We re-query the
    // direction select inside the assertion because the BINARY branch
    // unmounts and the FOREX branch mounts a fresh DOM node with the
    // same testid.
    fireEvent.change(accountSelect, { target: { value: FOREX_ACCOUNT.id } });
    await waitFor(() => {
      const options = Array.from(
        (screen.getByTestId('new-trade-direction') as HTMLSelectElement).querySelectorAll(
          'option',
        ),
      ).map((o) => o.value);
      expect(options).toEqual(expect.arrayContaining(['LONG', 'SHORT']));
      expect(
        (screen.getByTestId('new-trade-direction') as HTMLSelectElement).value,
      ).toBe('LONG');
    });

    // Switch back to BINARY → direction resets to CALL (the original
    // bug: this used to stay 'LONG' because the sync effect only fired
    // when `account.type !== selectedType`, but selectedType had already
    // followed the user's manual switch so the gate evaluated false).
    fireEvent.change(accountSelect, { target: { value: BINARY_ACCOUNT.id } });
    await waitFor(() => {
      const options = Array.from(
        (screen.getByTestId('new-trade-direction') as HTMLSelectElement).querySelectorAll(
          'option',
        ),
      ).map((o) => o.value);
      expect(options).toEqual(expect.arrayContaining(['CALL', 'PUT']));
      expect(
        (screen.getByTestId('new-trade-direction') as HTMLSelectElement).value,
      ).toBe('CALL');
    });
  });

  it('auto-selecciona la primera cuenta cuando los accounts cargan async', async () => {
    // First render: useAccounts has no data yet (simulated async load).
    const spy = vi
      .spyOn(accountsApi, 'listAccountsApi')
      .mockResolvedValueOnce({ items: [], total: 0, skip: 0, limit: 100 } satisfies AccountList)
      .mockResolvedValueOnce({
        items: [BINARY_ACCOUNT],
        total: 1,
        skip: 0,
        limit: 100,
      } satisfies AccountList);

    render(<NewTradeForm />, { wrapper: makeWrapper() });

    // First render with empty accounts → "no accounts" early-return.
    await waitFor(() => {
      expect(screen.getByTestId('new-trade-no-accounts')).toBeInTheDocument();
    });

    // Trigger a refetch by remounting with the BINARY_ACCOUNT data.
    spy.mockResolvedValue({
      items: [BINARY_ACCOUNT],
      total: 1,
      skip: 0,
      limit: 100,
    } satisfies AccountList);

    const { rerender } = render(<NewTradeForm />, { wrapper: makeWrapper() });
    rerender(<NewTradeForm />);

    await waitFor(() => {
      expect(screen.getAllByTestId('new-trade-account').length).toBeGreaterThan(0);
      const dir = screen.getAllByTestId('new-trade-direction')[0] as HTMLSelectElement;
      expect(dir.value).toBe('CALL');
    });

    expect(spy).toHaveBeenCalled();
  });
});