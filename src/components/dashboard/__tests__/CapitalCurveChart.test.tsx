/*
 * dashboard-jarvis-fidelity (Slice B, T-045, REQ-DCF-004) —
 * CapitalCurveChart badge tests.
 *
 * Pins the last-point badge contract for the capital curve:
 * absolute delta (last - first) + the formatted string.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('lightweight-charts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lightweight-charts')>();
  return {
    ...actual,
    createChart: vi.fn(() => ({
      addSeries: vi.fn(() => ({ setData: vi.fn() })),
      priceScale: vi.fn(() => ({ applyOptions: vi.fn() })),
      timeScale: vi.fn(() => ({ fitContent: vi.fn() })),
      applyOptions: vi.fn(),
      remove: vi.fn(),
    })),
  };
});

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver = MockResizeObserver;

const { CapitalCurveChart } = await import('../CapitalCurveChart');

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function mkPoint(
  over: Partial<{
    date: string;
    account_balance: number;
    cumulative_net_pnl: number;
    daily_pnl: number;
    capital_volume: number;
    trades: number;
  }> = {},
) {
  return {
    date: '2026-09-10',
    account_balance: 1000,
    cumulative_net_pnl: 0,
    daily_pnl: 0,
    capital_volume: 0,
    trades: 1,
    ...over,
  };
}

describe('CapitalCurveChart — T-045 badge', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra el badge dash-capital-lastpoint con la diferencia last - first', async () => {
    const points = [
      mkPoint({ date: '2026-09-08', account_balance: 1000 }),
      mkPoint({ date: '2026-09-09', account_balance: 1100 }),
      mkPoint({ date: '2026-09-10', account_balance: 1250.5 }),
    ];
    render(<CapitalCurveChart points={points} />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('dash-capital-lastpoint')).toBeInTheDocument();
    });

    const badge = screen.getByTestId('dash-capital-lastpoint');
    expect(badge.textContent).toContain('+$250.50');
    // Positioned absolutely top-right.
    expect(badge.className).toContain('absolute');
    expect(badge.className).toContain('top-3');
    expect(badge.className).toContain('right-3');
  });

  it('badge se oculta cuando points.length = 0', async () => {
    render(<CapitalCurveChart points={[]} />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.queryByTestId('dash-capital-lastpoint')).toBeNull();
    });
  });

  it('T-045 (triangulate): badge usa tono negativo cuando el delta es < 0', async () => {
    const points = [
      mkPoint({ date: '2026-09-08', account_balance: 1000 }),
      mkPoint({ date: '2026-09-09', account_balance: 800 }),
    ];
    render(<CapitalCurveChart points={points} />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('dash-capital-lastpoint')).toBeInTheDocument();
    });

    const badge = screen.getByTestId('dash-capital-lastpoint');
    // 800 - 1000 = -200 → text-loss.
    expect(badge.textContent).toContain('-$200.00');
  });

  /*
   * dashboard-jarvis-fidelity-v2 (REQ-DCF-JV2-009) — spline pivot.
   * The capital curve now renders as a smooth Lightweight-Charts
   * LineSeries with `lineType: Curved` + the JARVIS cyan gradient
   * area fill. The previous dashed-step style stays available via
   * `lineType: LineType.Curved` + `lineStyle: LineStyle.Dashed`
   * so the eye still reads it as "money in the account" instead
   * of "trading skill" (the companion chart on the same column).
   */
  describe('v2 spline + gradient (REQ-DCF-JV2-009)', () => {
    it('registra un LineSeries + AreaSeries para el capital curve', async () => {
      const points = [
        mkPoint({ date: '2026-09-08', account_balance: 1000 }),
        mkPoint({ date: '2026-09-09', account_balance: 1100 }),
      ];
      render(<CapitalCurveChart points={points} />, { wrapper: makeWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('dash-capital-lastpoint')).toBeInTheDocument();
      });

      const actual = await import('lightweight-charts');
      const createChartMock = (actual.createChart as unknown as ReturnType<typeof vi.fn>);
      const chartInstance = createChartMock.mock.results[0]?.value as
        | { addSeries: ReturnType<typeof vi.fn> }
        | undefined;
      expect(chartInstance).toBeDefined();
      const calls = chartInstance!.addSeries.mock.calls;
      // v2 registers BOTH the LineSeries (curve) and the AreaSeries
      // (gradient fill). Pre-v2 the chart had only the LineSeries.
      expect(calls.length).toBeGreaterThanOrEqual(2);

      const expectedLineCtor = actual.LineSeries;
      const expectedAreaCtor = actual.AreaSeries;
      const lineRegistered = calls.some((c) => c[0] === expectedLineCtor);
      const areaRegistered = calls.some((c) => c[0] === expectedAreaCtor);
      expect(lineRegistered, 'LineSeries should be registered').toBe(true);
      expect(areaRegistered, 'AreaSeries should be registered').toBe(true);
    });

    it('el spline carga los puntos account_balance (curva + fill)', async () => {
      const points = [
        mkPoint({ date: '2026-09-08', account_balance: 1000 }),
        mkPoint({ date: '2026-09-09', account_balance: 1100 }),
        mkPoint({ date: '2026-09-10', account_balance: 1250.5 }),
      ];
      render(<CapitalCurveChart points={points} />, { wrapper: makeWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('dash-capital-lastpoint')).toBeInTheDocument();
      });

      const actual = await import('lightweight-charts');
      const createChartMock = (actual.createChart as unknown as ReturnType<typeof vi.fn>);
      const chartInstance = createChartMock.mock.results[0]?.value as
        | { addSeries: ReturnType<typeof vi.fn> }
        | undefined;
      const lineIdx = chartInstance!.addSeries.mock.calls.findIndex(
        (c) => c[0] === actual.LineSeries,
      );
      const lineSeries = chartInstance!.addSeries.mock.results[lineIdx]?.value as
        | { setData: ReturnType<typeof vi.fn> }
        | undefined;
      expect(lineSeries).toBeDefined();
      expect(lineSeries!.setData).toHaveBeenCalled();
      const data = lineSeries!.setData.mock.calls[0]?.[0] as ReadonlyArray<{
        readonly time: string;
        readonly value: number;
      }>;
      expect(data).toHaveLength(3);
      expect(data![0]!.value).toBe(1000);
      expect(data![1]!.value).toBe(1100);
      expect(data![2]!.value).toBe(1250.5);
    });
  });
});
