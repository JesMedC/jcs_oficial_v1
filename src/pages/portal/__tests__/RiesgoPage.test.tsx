import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AuthContext, type AuthContextValue } from '../../../features/auth/AuthProvider';
import type { AuthMeOut } from '../../../features/auth/types';
import type { RiskSummary } from '../../../features/trades/types';
import { useRiskSummary } from '../../../features/trades/hooks';
import {
  useRiskControls,
  useUpdateRiskControls,
} from '../../../features/workspace-discipline/useRiskControls';
import { RiesgoPage } from '../RiesgoPage';

vi.mock('../../../features/trades/hooks', () => ({
  useRiskSummary: vi.fn(),
}));

vi.mock('../../../features/workspace-discipline/useRiskControls', () => ({
  useRiskControls: vi.fn(),
  useUpdateRiskControls: vi.fn(),
}));

const mockUseRiskSummary = vi.mocked(useRiskSummary);
const mockUseRiskControls = vi.mocked(useRiskControls);
const mockUseUpdateRiskControls = vi.mocked(useUpdateRiskControls);

function makeAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  const base: AuthMeOut = {
    user_id: 'u1',
    email: 'j@d.com',
    first_name: 'Jane',
    last_name: 'Doe',
    phone: '+54',
    role: 'USER',
    workspaces: [
      {
        id: 'w1',
        name: 'WS1',
        plan_tier: 'NONE',
        role_in_workspace: 'OWNER',
        created_at: '2026-01-01T00:00:00.000Z',
        risk_control_mode: 'operations',
        session_ops_cap: null,
        daily_loss_pct: null,
        weekly_loss_pct: null,
        monthly_loss_pct: null,
      },
    ],
    current_subscription: null,
    timezone: 'UTC',
  };
  return {
    user: base,
    subscription: null,
    loading: false,
    error: null,
    portal: 'user',
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    setPortal: vi.fn(),
    clearError: vi.fn(),
    ...overrides,
  };
}

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <HelmetProvider>
        <AuthContext.Provider value={makeAuthValue()}>{children}</AuthContext.Provider>
      </HelmetProvider>
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

function mockRiskControls() {
  mockUseRiskControls.mockReturnValue({
    data: {
      workspace_id: 'w1',
      plan_tier: 'NONE',
      risk_control_mode: 'operations',
      session_ops_cap: 7,
      daily_loss_pct: '2.00',
      weekly_loss_pct: '5.00',
      monthly_loss_pct: '10.00',
      ceiling: 10,
    },
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useRiskControls>);
  mockUseUpdateRiskControls.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  } as unknown as ReturnType<typeof useUpdateRiskControls>);
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
    mockRiskControls();

    render(<RiesgoPage />, { wrapper: makeWrapper() });

    expect(screen.getByRole('heading', { level: 1, name: 'Riesgo' })).toBeInTheDocument();
    expect(screen.getByText('Riesgo alto')).toBeInTheDocument();
    expect(screen.getByText('Stop diario recomendado')).toBeInTheDocument();
    expect(screen.getByText(/-US\$\s*150,00/)).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('shows workspace risk controls on the risk page', () => {
    mockRiskSummary({
      level: 'green',
      daily_pnl_usd: '25.00',
      open_trades_count: 0,
      win_rate_today: 1,
      message: 'Plan activo',
    });
    mockRiskControls();

    render(<RiesgoPage />, { wrapper: makeWrapper() });

    expect(screen.getByRole('heading', { level: 2, name: /Controles del workspace/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Cantidad de operaciones/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Porcentaje de pérdida/i })).not.toBeChecked();
    expect(screen.getByDisplayValue('7')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('2.00')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guardar límites/i })).toBeInTheDocument();
  });

  it('shows a loading message while the summary is pending', () => {
    mockUseRiskSummary.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useRiskSummary>);
    mockRiskControls();

    render(<RiesgoPage />, { wrapper: makeWrapper() });

    expect(screen.getByText('Cargando resumen de riesgo...')).toBeInTheDocument();
  });
});
