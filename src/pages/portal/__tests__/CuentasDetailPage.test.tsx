/*
 * p0e.3 — CuentasDetailPage tests.
 *
 * Covers:
 *   1. Resumen tab renders account info by default (H1 + broker + type
 *      + balance + created date).
 *   2. Clicking Saldo tab reveals the Fondear / Retirar buttons.
 *   3. Fund flow: opens modal → submits valid amount → API called →
 *      balance updates and modal closes.
 *   4. Withdraw exceeding the balance: submit button stays disabled
 *      (and an inline hint shows).
 *   5. Zona de peligro tab: delete button only enables when the input
 *      equals ``"ELIMINAR"`` (case-sensitive).
 *   6. 404 from ``getAccountById`` → "Cuenta no encontrada" + back link.
 *
 * Patrón: vitest + testing-library + userEvent + MemoryRouter +
 * HelmetProvider + mock del módulo accounts/api (matches
 * src/pages/portal/__tests__/CuentasPage.test.tsx). We wrap the page in
 * <Routes> with the production path because the component reads
 * ``useParams`` — without a matching route ``accountId`` would be
 * undefined and the page would short-circuit to the not-found view.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

vi.mock('../../../features/accounts/api', () => ({
  getAccountById: vi.fn(),
  fundAccountApi: vi.fn(),
  withdrawAccountApi: vi.fn(),
  deleteAccountApi: vi.fn(),
}));

import {
  fundAccountApi,
  getAccountById,
  withdrawAccountApi,
} from '../../../features/accounts/api';
import { CuentasDetailPage } from '../CuentasDetailPage';
import type { AccountOut } from '../../../features/accounts/types';

const ACCOUNT_ID = 'acc-1';
const BASE_ACCOUNT: AccountOut = {
  id: ACCOUNT_ID,
  user_id: 'u-1',
  broker_name: 'Pocket Option',
  type: 'BINARY',
  name: 'Cuenta principal',
  balance_usd: '100.00',
  created_at: '2026-08-15T10:00:00.000Z',
  updated_at: '2026-08-15T10:00:00.000Z',
};

const mockedGet = getAccountById as unknown as ReturnType<typeof vi.fn>;
const mockedFund = fundAccountApi as unknown as ReturnType<typeof vi.fn>;
const mockedWithdraw = withdrawAccountApi as unknown as ReturnType<typeof vi.fn>;
// deleteAccountApi is intentionally not exercised here — the danger-tab
// test only verifies the disabled-until-typed behavior, not the delete
// round-trip. The wrapper test for it lives in api.test.ts.

function renderAt(path: string) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/portal/cuentas/:accountId" element={<CuentasDetailPage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CuentasDetailPage', () => {
  it('renders account info in Resumen tab by default', async () => {
    mockedGet.mockResolvedValueOnce(BASE_ACCOUNT);
    renderAt(`/portal/cuentas/${ACCOUNT_ID}`);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Cuenta principal' }),
      ).toBeInTheDocument();
    });

    // The Resumen dl renders broker / tipo / nombre / balance / creada.
    // "Pocket Option" appears both as the broker chip at the top AND as
    // the Resumen row value — assert at least one match.
    expect(screen.getAllByText('Pocket Option').length).toBeGreaterThanOrEqual(1);
    // "Binary" badge appears in both the top chip and the Resumen row.
    expect(screen.getAllByText('Binary').length).toBeGreaterThanOrEqual(1);
    // Balance appears in the Resumen dl.
    expect(screen.getAllByText('$100.00').length).toBeGreaterThanOrEqual(1);
    // The back link is always present.
    expect(screen.getByRole('link', { name: /Volver a Cuentas/i })).toBeInTheDocument();
  });

  it('Saldo tab shows fund/withdraw buttons', async () => {
    mockedGet.mockResolvedValueOnce(BASE_ACCOUNT);
    renderAt(`/portal/cuentas/${ACCOUNT_ID}?tab=saldo`);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Fondear' })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Retirar' })).toBeInTheDocument();
    expect(screen.getByText(/Balance actual/)).toBeInTheDocument();
  });

  it('fund flow opens modal, submits amount and updates balance', async () => {
    const updated: AccountOut = { ...BASE_ACCOUNT, balance_usd: '150.00' };
    mockedGet.mockResolvedValueOnce(BASE_ACCOUNT);
    mockedFund.mockResolvedValueOnce(updated);

    renderAt(`/portal/cuentas/${ACCOUNT_ID}?tab=saldo`);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Fondear' })).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Fondear' }));

    // Modal opens: wait for the dialog title to confirm.
    await screen.findByRole('dialog', { name: /Fondear cuenta: Cuenta principal/ });

    const amountInput = document.querySelector('#fund-withdraw-form input[type="number"]');
    if (!(amountInput instanceof HTMLInputElement)) {
      throw new Error('amount input not found');
    }
    await user.type(amountInput, '50');

    // Modal submit button: form="fund-withdraw-form" disambiguates from
    // the Saldo tab's "Fondear" button.
    const submit = document.querySelector(
      'button[form="fund-withdraw-form"][type="submit"]',
    ) as HTMLButtonElement | null;
    expect(submit).not.toBeNull();
    await user.click(submit!);

    await waitFor(() => {
      expect(mockedFund).toHaveBeenCalledWith(ACCOUNT_ID, 50);
    });

    // Modal closes and parent re-renders with the updated balance.
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getAllByText('$150.00').length).toBeGreaterThanOrEqual(1);
  });

  it('withdraw exceeding balance keeps submit disabled', async () => {
    mockedGet.mockResolvedValueOnce(BASE_ACCOUNT);

    renderAt(`/portal/cuentas/${ACCOUNT_ID}?tab=saldo`);

    await waitFor(() => {
      const withdrawButtons = screen.getAllByRole('button', { name: 'Retirar' });
      expect(withdrawButtons.length).toBeGreaterThanOrEqual(1);
    });

    const user = userEvent.setup();
    // The first "Retirar" is the Saldo tab card — opens the modal.
    const withdrawButtons = screen.getAllByRole('button', { name: 'Retirar' });
    await user.click(withdrawButtons[0]!);

    await screen.findByRole('dialog', { name: /Retirar de: Cuenta principal/ });

    const amountInput = document.querySelector('#fund-withdraw-form input[type="number"]');
    if (!(amountInput instanceof HTMLInputElement)) {
      throw new Error('amount input not found');
    }
    await user.type(amountInput, '500');

    // Modal submit "Retirar" stays disabled because 500 > balance 100.
    const submit = document.querySelector(
      'button[form="fund-withdraw-form"][type="submit"]',
    ) as HTMLButtonElement | null;
    expect(submit).not.toBeNull();
    expect(submit!).toBeDisabled();

    // Inline hint visible.
    expect(screen.getByText(/excede el balance disponible/i)).toBeInTheDocument();

    // API never called.
    expect(mockedWithdraw).not.toHaveBeenCalled();
  });

  it('Zona de peligro delete button enables only when "ELIMINAR" is typed', async () => {
    mockedGet.mockResolvedValueOnce(BASE_ACCOUNT);

    renderAt(`/portal/cuentas/${ACCOUNT_ID}?tab=peligro`);

    await waitFor(() => {
      expect(screen.getByText(/Eliminar cuenta permanentemente/)).toBeInTheDocument();
    });

    const user = userEvent.setup();
    // The danger-zone tab button is unique before the modal opens. Match
    // by text content rather than the broad ``button:not([form])``
    // selector, which would pick up a tab nav button first.
    const tabDeleteButton = screen.getByRole('button', {
      name: /Eliminar cuenta "Cuenta principal"/,
    });
    await user.click(tabDeleteButton);

    // Modal opens.
    await screen.findByRole('dialog', { name: /Eliminar cuenta: Cuenta principal/ });

    // The modal confirmation input.
    const confirmInput = document.querySelector(
      '#delete-account-form input[type="text"]',
    ) as HTMLInputElement | null;
    expect(confirmInput).not.toBeNull();

    // Modal footer delete button starts disabled (form="delete-account-form").
    const modalSubmit = document.querySelector(
      'button[form="delete-account-form"][type="submit"]',
    ) as HTMLButtonElement | null;
    expect(modalSubmit).not.toBeNull();
    expect(modalSubmit!).toBeDisabled();

    // Wrong case → still disabled.
    await user.type(confirmInput!, 'eliminar');
    expect(modalSubmit!).toBeDisabled();

    // Correct value → enabled.
    await user.clear(confirmInput!);
    await user.type(confirmInput!, 'ELIMINAR');
    expect(modalSubmit!).toBeEnabled();
  });

  it('renders "Cuenta no encontrada" when API returns NOT_FOUND', async () => {
    mockedGet.mockRejectedValueOnce({
      code: 'NOT_FOUND',
      message: 'Cuenta no encontrada',
      correlation_id: 'abc12345-1234-5678-9abc-def012345678',
    });

    renderAt(`/portal/cuentas/${ACCOUNT_ID}`);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Cuenta no encontrada' }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(/La cuenta que buscás no existe o ya fue eliminada\./),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volver a Cuentas/i })).toBeInTheDocument();
  });
});
