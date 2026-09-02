/*
 * FASE 4A — TradeFilters render tests.
 *
 * Locks the four behaviours the filter row contract promises:
 *   - renders all three selects on first paint.
 *   - status change dispatches a normalised patch to onChange.
 *   - "Limpiar filtros" is hidden when no filter is active.
 *   - "Limpiar filtros" appears as soon as any filter is set.
 *
 * ``useAccounts`` is stubbed via ``vi.spyOn`` (same pattern as
 * ``TradeTable.test.tsx`` and the hooks tests) so the component
 * stays network-free and only the filter wiring is exercised.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import * as accountsHooks from '../../accounts/hooks';
import { TradeFilters } from '../TradeFilters';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function mockAccountsEmpty() {
  return vi.spyOn(accountsHooks, 'useAccounts').mockReturnValue({
    data: { items: [], total: 0, skip: 0, limit: 50 },
  } as unknown as ReturnType<typeof accountsHooks.useAccounts>);
}

describe('TradeFilters', () => {
  it('renderiza los 3 selects', () => {
    mockAccountsEmpty();
    render(<TradeFilters filters={{}} onChange={() => {}} />, {
      wrapper: makeWrapper(),
    });
    expect(screen.getByTestId('filter-status')).toBeInTheDocument();
    expect(screen.getByTestId('filter-type')).toBeInTheDocument();
    expect(screen.getByTestId('filter-account')).toBeInTheDocument();
  });

  it('llama onChange con patch cuando cambia status', () => {
    mockAccountsEmpty();
    const onChange = vi.fn();
    render(<TradeFilters filters={{}} onChange={onChange} />, {
      wrapper: makeWrapper(),
    });
    fireEvent.change(screen.getByTestId('filter-status'), {
      target: { value: 'OPEN' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'OPEN' }),
    );
  });

  it('no muestra "Limpiar filtros" cuando no hay filtros activos', () => {
    mockAccountsEmpty();
    render(<TradeFilters filters={{}} onChange={() => {}} />, {
      wrapper: makeWrapper(),
    });
    expect(screen.queryByTestId('filter-clear')).not.toBeInTheDocument();
  });

  it('muestra "Limpiar filtros" cuando hay filtros activos', () => {
    mockAccountsEmpty();
    render(<TradeFilters filters={{ status: 'OPEN' }} onChange={() => {}} />, {
      wrapper: makeWrapper(),
    });
    expect(screen.getByTestId('filter-clear')).toBeInTheDocument();
  });
});
