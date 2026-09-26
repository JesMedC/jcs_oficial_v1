import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { RiskSummary } from '../../../features/trades/types';
import { useRiskSummary } from '../../../features/trades/hooks';
import { RiesgoPage } from '../RiesgoPage';

vi.mock('../../../features/trades/hooks', () => ({
  useRiskSummary: vi.fn(),
}));

const mockUseRiskSummary = vi.mocked(useRiskSummary);

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <HelmetProvider>{children}</HelmetProvider>
    </QueryClientProvider>
  );
}

function mockRiskSummary(data: RiskSummary) {
  mockUseRiskSummary.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useRiskSummary>);
}

describe('RiesgoPage', () => {
  it('renders the risk summary from useRiskSummary', () => {
    mockRiskSummary({
      level: 'red',
      daily_pnl_usd: '-150.00',
      open_trades_count: 4,
      win_rate_today: 0.25,
      message: 'Stop diario recomendado',
    });

    render(<RiesgoPage />, { wrapper: makeWrapper() });

    expect(screen.getByRole('heading', { level: 1, name: 'Riesgo' })).toBeInTheDocument();
    expect(screen.getByText('Riesgo alto')).toBeInTheDocument();
    expect(screen.getByText('Stop diario recomendado')).toBeInTheDocument();
    expect(screen.getByText(/-US\$\s*150,00/)).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('shows a loading message while the summary is pending', () => {
    mockUseRiskSummary.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useRiskSummary>);

    render(<RiesgoPage />, { wrapper: makeWrapper() });

    expect(screen.getByText('Cargando resumen de riesgo...')).toBeInTheDocument();
  });
});
