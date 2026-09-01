/*
 * p0c — AdminPaymentsPage tests.
 *
 * Cubre:
 * 1. Renderiza H1 + tabla vacía al cargar.
 * 2. Renderiza las filas con badges cuando hay pagos.
 * 3. Cambia el filtro de status y vuelve a fetchear.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

vi.mock('../../../features/payments/api', () => ({
  listPaymentsApi: vi.fn(),
}));

import { listPaymentsApi } from '../../../features/payments/api';
import { AdminPaymentsPage } from '../AdminPaymentsPage';
import type { PaymentOut, PaymentList } from '../../../features/payments/types';

const mockedList = listPaymentsApi as unknown as ReturnType<typeof vi.fn>;

function buildPayments(): PaymentOut[] {
  return [
    {
      id: 'p1',
      mp_payment_id: 'mp-12345',
      user_id: 'u1',
      subscription_id: null,
      status: 'APPROVED',
      amount_usd: '9.99',
      payer_email: 'payer@example.com',
      mp_created_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'p2',
      mp_payment_id: 'mp-67890',
      user_id: 'u2',
      subscription_id: null,
      status: 'REJECTED',
      amount_usd: '9.99',
      payer_email: 'reject@example.com',
      mp_created_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}

function emptyList(): PaymentList {
  return { items: [], total: 0, skip: 0, limit: 25 };
}

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <AdminPaymentsPage />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AdminPaymentsPage', () => {
  it('renders H1 + empty state', async () => {
    mockedList.mockResolvedValueOnce(emptyList());
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Pagos' })).toBeInTheDocument();
    });
    expect(screen.getByText(/Sin pagos para mostrar/)).toBeInTheDocument();
  });

  it('renders rows with status badges', async () => {
    mockedList.mockResolvedValueOnce({
      items: buildPayments(),
      total: 2,
      skip: 0,
      limit: 25,
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('mp-12345')).toBeInTheDocument();
    });
    expect(screen.getByText('payer@example.com')).toBeInTheDocument();
    // ``$9.99`` aparece en cada fila (2 pagos seeded).
    expect(screen.getAllByText('$9.99').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Aprobado')).toBeInTheDocument();
    expect(screen.getByText('Rechazado')).toBeInTheDocument();
  });

  it('changing the status filter refetches', async () => {
    mockedList.mockResolvedValueOnce(emptyList());
    mockedList.mockResolvedValueOnce(emptyList());
    renderPage();

    await waitFor(() => {
      expect(mockedList).toHaveBeenCalledTimes(1);
    });

    const user = userEvent.setup();
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    await user.selectOptions(select, 'APPROVED');

    await waitFor(() => {
      expect(mockedList).toHaveBeenCalledTimes(2);
    });
    expect(mockedList).toHaveBeenLastCalledWith({
      status: 'APPROVED',
      skip: 0,
      limit: 25,
    });
  });
});