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
 *
 * one-by-one-thousand-discipline (PR-4) — the INVERSIÓN USD field is
 * now a read-only, derived display. The investment is computed from
 * the active account's balance via a three-tier rule (floor / 0.25%
 * round-up / 0.10% round-up, capped at $404). The previous
 * "Máx permitido" pill is gone — the field IS the canonical display.
 * The describe block at the bottom locks every tier boundary.
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

  it('muestra mensaje legible cuando la request excede el timeout', async () => {
    // Reproduces the production ECONNABORTED path: raw axios timeout
    // error raised from the interceptor-bypassing test mock. The form
    // must translate the raw "timeout of 15000ms exceeded" into the
    // user-friendly Spanish copy so users don't see axios internals.
    // The journal soft-block guard rail intercepts the first submit
    // when notes + tags are empty, so the test exercises the canonical
    // "Guardar igual" path (the production user action when they
    // intentionally want to skip journaling).
    //
    // PR-4: investment_usd is no longer user-typed — it's computed
    // from balance. $20000 > $1000 → tier 3 (0.10%) → $20. The
    // predictive hard-block ceiling for the 0.25% rule at $20000 is
    // $50, so $20 stays comfortably below the block threshold.
    const highBalance = { ...BINARY_ACCOUNT, balance_usd: '20000.00' };
    mockAccounts([highBalance]);
    vi.spyOn(tradesApi, 'openTradeApi').mockRejectedValue(
      Object.assign(new Error('timeout of 15000ms exceeded'), {
        code: 'ECONNABORTED',
      }),
    );

    render(<NewTradeForm />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('new-trade-submit')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('new-trade-submit'));

    await waitFor(() => {
      const alert = screen.getByTestId('new-trade-error');
      expect(alert.textContent).toBe('La operación tardó demasiado. Reintentá.');
    });
  });

  it('muestra el envelope code+message cuando el backend rechaza con INSUFFICIENT_BALANCE', async () => {
    // Verifies the second branch of the error mapper: a normalised
    // envelope from the response interceptor (e.g. a 422 with the
    // canonical { code, message, correlation_id } body) must surface
    // both the code and the message verbatim.
    //
    // PR-4: same balance rationale as the timeout test — the
    // calculated $20 investment passes the predictive hard-block so
    // the request reaches the wire.
    const highBalance = { ...BINARY_ACCOUNT, balance_usd: '20000.00' };
    mockAccounts([highBalance]);
    vi.spyOn(tradesApi, 'openTradeApi').mockRejectedValue({
      code: 'INSUFFICIENT_BALANCE',
      message: 'Saldo insuficiente para abrir la operación.',
      correlation_id: 'corr-abc-123',
    });

    render(<NewTradeForm />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('new-trade-submit')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('new-trade-submit'));

    await waitFor(() => {
      const alert = screen.getByTestId('new-trade-error');
      expect(alert.textContent).toBe(
        'INSUFFICIENT_BALANCE: Saldo insuficiente para abrir la operación.',
      );
    });
  });
});

/*
 * one-by-one-thousand-discipline (PR-4) — INVERSIÓN USD derived
 * display. The investment is computed from the account balance
 * via a three-tier rule (see ``montoCalculadoParaBalance`` in
 * ``discipline.ts``):
 *
 *   balance <  $400   → $1 (fixed; first tier floor)
 *   $400 ≤ balance ≤ $1000  → ceil(balance × 0.0025)
 *   balance >  $1000      → ceil(balance × 0.001)
 *
 * ALWAYS capped at the $404 broker ceiling and floored at $1.
 *
 * Cases below cover both tier boundaries (low/mid and mid/high)
 * plus two mid-range scenarios. The $200000 case stays well below
 * the broker cap under the high-balance rule (0.10%) — a useful
 * regression guard against accidentally reverting to the old
 * 0.25%-everywhere rule.
 */
describe('NewTradeForm — INVERSIÓN USD derived display (PR-4)', () => {
  it('campo es read-only (no permite tipear) y muestra $1 con balance de $300', async () => {
    // $300 < $400 → tier 1 (fixed floor).
    const lowBalance = { ...BINARY_ACCOUNT, balance_usd: '300.00' };
    mockAccounts([lowBalance]);

    render(<NewTradeForm />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('new-trade-investment')).toBeInTheDocument();
    });

    const field = screen.getByTestId('new-trade-investment');
    expect(field.tagName.toLowerCase()).toBe('output');
    expect(field.textContent).toBe('$1');
  });

  it('muestra $2 con balance de $404 (tier 2 bajo, ceil(1.01))', async () => {
    // $404 just inside tier 2 — ceil(404 × 0.0025) = ceil(1.01) = 2.
    // The user's cited example: "si da 1.01 debe ser 2".
    const boundary = { ...BINARY_ACCOUNT, balance_usd: '404.00' };
    mockAccounts([boundary]);

    render(<NewTradeForm />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('new-trade-investment')).toBeInTheDocument();
    });
    expect(screen.getByTestId('new-trade-investment').textContent).toBe('$2');
  });

  it('muestra $3 con balance de $1000 (tier 2 alto, ceil(2.5))', async () => {
    // $1000 is the inclusive upper bound of tier 2 — ceil(1000 ×
    // 0.0025) = ceil(2.5) = 3. Just past this point the rule
    // switches to the tighter 0.10% tier.
    const midUpper = { ...BINARY_ACCOUNT, balance_usd: '1000.00' };
    mockAccounts([midUpper]);

    render(<NewTradeForm />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('new-trade-investment')).toBeInTheDocument();
    });
    expect(screen.getByTestId('new-trade-investment').textContent).toBe('$3');
  });

  it('muestra $2 con balance de $1001 (cruce al tier 3, ceil(1.001))', async () => {
    // $1001 just past the tier 2 → tier 3 boundary — ceil(1001 ×
    // 0.001) = ceil(1.001) = 2. Verifies the higher-balance tier is
    // genuinely stricter than the previous "0.25% everywhere" rule.
    const boundaryHigh = { ...BINARY_ACCOUNT, balance_usd: '1001.00' };
    mockAccounts([boundaryHigh]);

    render(<NewTradeForm />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('new-trade-investment')).toBeInTheDocument();
    });
    expect(screen.getByTestId('new-trade-investment').textContent).toBe('$2');
  });

  it('muestra $5 con balance de $5000 (tier 3, mid-range)', async () => {
    // $5000 → ceil(5000 × 0.001) = 5.
    const midHigh = { ...BINARY_ACCOUNT, balance_usd: '5000.00' };
    mockAccounts([midHigh]);

    render(<NewTradeForm />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('new-trade-investment')).toBeInTheDocument();
    });
    expect(screen.getByTestId('new-trade-investment').textContent).toBe('$5');
  });

  it('muestra $200 con balance de $200000 (tier 3, sin tocar el cap)', async () => {
    // $200000 → ceil(200000 × 0.001) = 200. Far below the $404
    // broker cap, so this is a regression guard: under the OLD
    // (PR-3) rule this would have shown $404. If you see $404 here,
    // someone reverted the high-balance tier to 0.25%.
    const veryHigh = { ...BINARY_ACCOUNT, balance_usd: '200000.00' };
    mockAccounts([veryHigh]);

    render(<NewTradeForm />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('new-trade-investment')).toBeInTheDocument();
    });
    expect(screen.getByTestId('new-trade-investment').textContent).toBe('$200');
  });

  it('muestra el placeholder "—" y deshabilita submit con balance < $1', async () => {
    // Below the $1 floor the calculator returns null and the form
    // surfaces the placeholder "—" in the field. The submit button
    // is also disabled (no valid investment to send).
    const empty = { ...BINARY_ACCOUNT, balance_usd: '0.50' };
    mockAccounts([empty]);

    render(<NewTradeForm />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('new-trade-investment')).toBeInTheDocument();
    });
    expect(screen.getByTestId('new-trade-investment').textContent).toBe('—');
    expect(screen.getByTestId('new-trade-submit')).toBeDisabled();
  });
});
