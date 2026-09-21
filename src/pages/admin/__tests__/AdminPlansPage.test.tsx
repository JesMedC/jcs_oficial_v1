/*
 * p0b.2 — AdminPlansPage tests (2 cases).
 *
 *   1. renders the three plan rows (Starter, Plus, Elite) with their
 *      current prices.
 *   2. clicking "Editar precio" opens the edit form; clicking Save
 *      calls updatePlanPriceApi with the typed value and refetches.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

vi.mock('../../../features/admin/api', () => ({
  listUsersApi: vi.fn(),
  setUserActiveApi: vi.fn(),
  listPlansApi: vi.fn(),
  updatePlanPriceApi: vi.fn(),
}));

import { listPlansApi, updatePlanPriceApi } from '../../../features/admin/api';
import { AdminPlansPage } from '../AdminPlansPage';
import type { PlanTierPrice } from '../../../features/admin/types';

const mockedList = listPlansApi as unknown as ReturnType<typeof vi.fn>;
const mockedUpdate = updatePlanPriceApi as unknown as ReturnType<typeof vi.fn>;

function buildPlans(): PlanTierPrice[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'p1',
      tier: 'STARTER',
      price_usd: '0.00',
      billing_period_days: 30,
      is_active: true,
      effective_from: now,
      effective_until: null,
      created_at: now,
    },
    {
      id: 'p2',
      tier: 'PLUS',
      price_usd: '9.99',
      billing_period_days: 30,
      is_active: true,
      effective_from: now,
      effective_until: null,
      created_at: now,
    },
    {
      id: 'p3',
      tier: 'ELITE',
      price_usd: '29.99',
      billing_period_days: 30,
      is_active: true,
      effective_from: now,
      effective_until: null,
      created_at: now,
    },
  ];
}

beforeEach(() => {
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <AdminPlansPage />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe('AdminPlansPage', () => {
  it('renders the three plan cards with their current prices', async () => {
    mockedList.mockResolvedValueOnce(buildPlans());

    renderPage();

    await waitFor(() => {
      // Each tier card renders the dollar-formatted price.
      expect(screen.getByText('$0.00')).toBeInTheDocument();
      expect(screen.getByText('$9.99')).toBeInTheDocument();
      expect(screen.getByText('$29.99')).toBeInTheDocument();
    });
    // Títulos de los tres tiers.
    expect(screen.getByRole('heading', { level: 3, name: 'Starter' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Plus' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Elite' })).toBeInTheDocument();
  });

  it('opens the edit form, calls updatePlanPriceApi on save, and refetches', async () => {
    mockedList.mockResolvedValueOnce(buildPlans()).mockResolvedValueOnce(buildPlans());
    mockedUpdate.mockResolvedValueOnce({
      ...buildPlans()[1],
      id: 'p-new',
      price_usd: '12.99',
    });

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('$9.99')).toBeInTheDocument();
    });

    // Click "Editar precio" — there are 3 matches (one per card).
    const editButtons = await screen.findAllByRole('button', { name: 'Editar precio' });
    expect(editButtons[1]).toBeDefined();
    // The middle button (Plus tier) is at index 1.
    await user.click(editButtons[1]!);

    const input = screen.getByLabelText('Precio USD') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '12.99');

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledWith('PLUS', '12.99');
    });
    // Refetch issued.
    await waitFor(() => {
      expect(mockedList.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
