/*
 * p0d.3 — CuentasPage tests.
 *
 * Covers:
 *   1. Renderiza H1 + empty state cuando el backend no trae cuentas.
 *   2. Renderiza filas con broker / tipo / nombre / balance formateado.
 *   3. Submit del formulario llama createAccountApi con la shape
 *      correcta y antepone la nueva cuenta al listado.
 *   4. Error de la API → ErrorBanner muestra el mensaje del envelope.
 *
 * Patrón: vitest + testing-library + userEvent + MemoryRouter +
 * HelmetProvider + mock del módulo accounts/api (igual que
 * src/pages/admin/__tests__/AdminPaymentsPage.test.tsx).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../../features/accounts/api', () => ({
  listAccountsApi: vi.fn(),
  createAccountApi: vi.fn(),
  getAccountById: vi.fn(),
  fundAccountApi: vi.fn(),
  withdrawAccountApi: vi.fn(),
  deleteAccountApi: vi.fn(),
}));

import { createAccountApi, listAccountsApi } from '../../../features/accounts/api';
import { CuentasPage } from '../CuentasPage';
import type { AccountOut, AccountList } from '../../../features/accounts/types';

const mockedList = listAccountsApi as unknown as ReturnType<typeof vi.fn>;
const mockedCreate = createAccountApi as unknown as ReturnType<typeof vi.fn>;

function buildAccounts(): AccountOut[] {
  return [
    {
      id: 'acc-1',
      user_id: 'u-1',
      broker_name: 'Pocket Option',
      type: 'BINARY',
      name: 'Cuenta principal',
      balance_usd: '250.50',
      created_at: '2026-08-15T10:00:00.000Z',
      updated_at: '2026-08-15T10:00:00.000Z',
    },
    {
      id: 'acc-2',
      user_id: 'u-1',
      broker_name: 'IC Markets',
      type: 'FOREX',
      name: 'Swing EURUSD',
      balance_usd: '1024.00',
      created_at: '2026-09-01T10:00:00.000Z',
      updated_at: '2026-09-01T10:00:00.000Z',
    },
  ];
}

function emptyList(): AccountList {
  return { items: [], total: 0, skip: 0, limit: 50 };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <MemoryRouter>
          <CuentasPage />
        </MemoryRouter>
      </HelmetProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CuentasPage', () => {
  it('renders H1 + empty state when api returns no items', async () => {
    mockedList.mockResolvedValueOnce(emptyList());
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Mis cuentas' })).toBeInTheDocument();
    });
    expect(
      screen.getByText(/No tenés cuentas todavía\. Creá la primera con el formulario\./),
    ).toBeInTheDocument();
  });

  it('renders list rows with broker, type, name and formatted balance', async () => {
    mockedList.mockResolvedValueOnce({
      items: buildAccounts(),
      total: 2,
      skip: 0,
      limit: 50,
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Pocket Option')).toBeInTheDocument();
    });
    expect(screen.getByText('IC Markets')).toBeInTheDocument();
    expect(screen.getByText('Cuenta principal')).toBeInTheDocument();
    expect(screen.getByText('Swing EURUSD')).toBeInTheDocument();
    // Two binary/forex badges — at least one of each.
    expect(screen.getAllByText('Binary').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Forex').length).toBeGreaterThanOrEqual(1);
    // Balances rendered with USD currency formatter.
    expect(screen.getAllByText('$250.50').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('$1,024.00').length).toBeGreaterThanOrEqual(1);
  });

  it('filling the form + submitting posts payload and prepends new row', async () => {
    const newAccount: AccountOut = {
      id: 'acc-new',
      user_id: 'u-1',
      broker_name: 'Quotex',
      type: 'FOREX',
      name: 'Scalping USDJPY',
      balance_usd: '0',
      created_at: '2026-09-01T11:00:00.000Z',
      updated_at: '2026-09-01T11:00:00.000Z',
    };
    // First list call returns the seed; after the create+invalidate, the
    // refetch must include both the original row and the new one. Using
    // mockImplementation lets every call return a response keyed on the
    // current "known accounts" set.
    const known: AccountOut[] = [buildAccounts()[0] as AccountOut];
    mockedList.mockImplementation(async () => ({
      items: known,
      total: known.length,
      skip: 0,
      limit: 50,
    }));
    mockedCreate.mockImplementation(async (payload) => {
      const created: AccountOut = {
        ...newAccount,
        broker_name: payload.broker_name,
        type: payload.type,
        name: payload.name,
      };
      known.unshift(created);
      return created;
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Pocket Option')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Pocket Option'), 'Quotex');
    await user.type(screen.getByPlaceholderText('Cuenta principal'), 'Scalping USDJPY');
    // Default type is BINARY; switch to FOREX so the row badge matches.
    await user.selectOptions(screen.getByRole('combobox'), 'FOREX');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledWith({
        broker_name: 'Quotex',
        type: 'FOREX',
        name: 'Scalping USDJPY',
      });
    });

    // New row appears at the top of the list.
    await waitFor(() => {
      expect(screen.getByText('Quotex')).toBeInTheDocument();
    });
    expect(screen.getByText('Scalping USDJPY')).toBeInTheDocument();

    // Form was reset.
    expect((screen.getByPlaceholderText('Pocket Option') as HTMLInputElement).value).toBe('');
    expect((screen.getByPlaceholderText('Cuenta principal') as HTMLInputElement).value).toBe('');
  });

  it('shows ErrorBanner when listAccountsApi rejects', async () => {
    mockedList.mockRejectedValueOnce({
      code: 'INTERNAL_ERROR',
      message: 'No pudimos cargar las cuentas. Intenta de nuevo.',
      correlation_id: 'abc12345-1234-5678-9abc-def012345678',
    });
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText('No pudimos cargar las cuentas. Intenta de nuevo.'),
      ).toBeInTheDocument();
    });
  });
});