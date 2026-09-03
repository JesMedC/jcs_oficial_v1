/*
 * FASE 4A / FASE 4E — TradeFilters render tests.
 *
 * Locks the four behaviours the filter row contract promises:
 *   - renders all controls (status / type / account / from / to +
 *     export) on first paint.
 *   - status change dispatches a normalised patch to onChange.
 *   - "Limpiar filtros" is hidden when no filter is active.
 *   - "Limpiar filtros" appears as soon as any filter is set,
 *     AND clears BOTH the backend filters and the client-side date
 *     range when clicked.
 *   - "Exportar CSV" is disabled when no rows match.
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

interface RenderOpts {
  readonly filters?: Parameters<typeof TradeFilters>[0]['filters'];
  readonly dateRange?: Parameters<typeof TradeFilters>[0]['dateRange'];
  readonly matchCount?: number;
  readonly onChange?: () => void;
  readonly onDateRangeChange?: () => void;
  readonly onExport?: () => void;
}

function renderFilters(opts: RenderOpts = {}) {
  const noop = () => undefined;
  return render(
    <TradeFilters
      filters={opts.filters ?? {}}
      dateRange={opts.dateRange ?? { from: '', to: '' }}
      onChange={opts.onChange ?? noop}
      onDateRangeChange={opts.onDateRangeChange ?? noop}
      matchCount={opts.matchCount ?? 0}
      onExport={opts.onExport ?? noop}
    />,
    { wrapper: makeWrapper() },
  );
}

describe('TradeFilters', () => {
  it('renderiza los 5 selects + 2 inputs + export', () => {
    mockAccountsEmpty();
    renderFilters();
    expect(screen.getByTestId('filter-status')).toBeInTheDocument();
    expect(screen.getByTestId('filter-type')).toBeInTheDocument();
    expect(screen.getByTestId('filter-account')).toBeInTheDocument();
    expect(screen.getByTestId('filter-from')).toBeInTheDocument();
    expect(screen.getByTestId('filter-to')).toBeInTheDocument();
    expect(screen.getByTestId('trade-export-csv')).toBeInTheDocument();
  });

  it('llama onChange con patch cuando cambia status', () => {
    mockAccountsEmpty();
    const onChange = vi.fn();
    renderFilters({ onChange });
    fireEvent.change(screen.getByTestId('filter-status'), {
      target: { value: 'OPEN' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'OPEN' }),
    );
  });

  it('llama onDateRangeChange cuando cambia "Desde"', () => {
    mockAccountsEmpty();
    const onDateRangeChange = vi.fn();
    renderFilters({ onDateRangeChange });
    fireEvent.change(screen.getByTestId('filter-from'), {
      target: { value: '2026-01-01' },
    });
    expect(onDateRangeChange).toHaveBeenCalledWith(
      expect.objectContaining({ from: '2026-01-01' }),
    );
  });

  it('no muestra "Limpiar filtros" cuando no hay filtros activos', () => {
    mockAccountsEmpty();
    renderFilters();
    expect(screen.queryByTestId('filter-clear')).not.toBeInTheDocument();
  });

  it('muestra "Limpiar filtros" cuando hay filtros activos', () => {
    mockAccountsEmpty();
    renderFilters({ filters: { status: 'OPEN' } });
    expect(screen.getByTestId('filter-clear')).toBeInTheDocument();
  });

  it('muestra "Limpiar filtros" cuando hay fechas', () => {
    mockAccountsEmpty();
    renderFilters({ dateRange: { from: '2026-01-01', to: '' } });
    expect(screen.getByTestId('filter-clear')).toBeInTheDocument();
  });

  it('"Limpiar filtros" limpia filtros + fechas', () => {
    mockAccountsEmpty();
    const onChange = vi.fn();
    const onDateRangeChange = vi.fn();
    renderFilters({
      filters: { status: 'OPEN' },
      dateRange: { from: '2026-01-01', to: '2026-01-31' },
      onChange,
      onDateRangeChange,
    });
    fireEvent.click(screen.getByTestId('filter-clear'));
    expect(onChange).toHaveBeenCalledWith({});
    expect(onDateRangeChange).toHaveBeenCalledWith({ from: '', to: '' });
  });

  it('deshabilita "Exportar CSV" cuando no hay matches', () => {
    mockAccountsEmpty();
    renderFilters({ matchCount: 0 });
    expect(screen.getByTestId('trade-export-csv')).toBeDisabled();
  });

  it('habilita "Exportar CSV" cuando hay matches', () => {
    mockAccountsEmpty();
    renderFilters({ matchCount: 5 });
    expect(screen.getByTestId('trade-export-csv')).not.toBeDisabled();
  });
});
