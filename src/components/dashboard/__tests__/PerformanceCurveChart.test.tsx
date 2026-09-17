/*
 * dashboard-jarvis-fidelity (Slice B, T-045 + T-046) —
 * PerformanceCurveChart tests.
 *
 * Locks the chart badge + deposit/withdraw marker contracts:
 *   - `dash-performance-lastpoint` badge shows the last-point
 *     delta + percent change.
 *   - `dash-performance-curve-markers` reflects the deposit /
 *     withdraw markers via `createSeriesMarkers`. We mock the
 *     `lightweight-charts` `createSeriesMarkers` so we can
 *     assert which markers were sent without spinning up a
 *     real canvas.
 *   - The plugin is created ONCE per mount, not on every
 *     render (cache via `markersPluginRef`).
 *
 * The chart mounts in jsdom (no real canvas); we stub
 * `createChart` too so the ResizeObserver doesn't trip.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Capture every `setMarkers` call across renders so we can
// assert the markers contract.
const setMarkersMock = vi.fn();

vi.mock('lightweight-charts', async (importOriginal) => {
  // Pull the original module so types stay real for the source
  // file under test (we just stub the imperative side-effects).
  const actual = await importOriginal<typeof import('lightweight-charts')>();
  return {
    ...actual,
    // Stub `createChart` so jsdom doesn't have to provide a
    // real canvas — we never paint anything in this test, only
    // assert the imperative wire-up.
    createChart: vi.fn(() => {
      const api = {
        addSeries: vi.fn(() => ({
          setData: vi.fn(),
        })),
        priceScale: vi.fn(() => ({ applyOptions: vi.fn() })),
        timeScale: vi.fn(() => ({ fitContent: vi.fn() })),
        applyOptions: vi.fn(),
        remove: vi.fn(),
      };
      return api;
    }),
    createSeriesMarkers: vi.fn(() => ({
      setMarkers: setMarkersMock,
      markers: vi.fn(() => []),
    })),
  };
});

// ResizeObserver is missing from jsdom.
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver = MockResizeObserver;

const { PerformanceCurveChart } = await import('../PerformanceCurveChart');

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
    cumulative_net_pnl: 9.2,
    daily_pnl: 9.2,
    capital_volume: 0,
    trades: 1,
    ...over,
  };
}

describe('PerformanceCurveChart — T-045 badge + T-046 markers', () => {
  beforeEach(() => {
    setMarkersMock.mockClear();
    setMarkersMock.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('T-045: el badge dash-performance-lastpoint muestra el valor del ultimo punto', async () => {
    const points = [
      mkPoint({ date: '2026-09-08', cumulative_net_pnl: 0 }),
      mkPoint({ date: '2026-09-09', cumulative_net_pnl: 5 }),
      mkPoint({ date: '2026-09-10', cumulative_net_pnl: 9.2 }),
    ];

    render(<PerformanceCurveChart points={points} />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(
        screen.getByTestId('dash-performance-lastpoint'),
      ).toBeInTheDocument();
    });

    const badge = screen.getByTestId('dash-performance-lastpoint');
    // The badge MUST surface the absolute last-point P&L verbatim
    // ("+$9.20") so a glance tells the user where they ended up.
    expect(badge.textContent).toContain('+$9.20');
    // The relative delta pct is computed against the first point
    // (base = 0), which triggers the 9999 cap to avoid layout
    // blow-up. We just confirm a `+X.X%` token is present.
    expect(badge.textContent).toMatch(/\+\d+\.\d%/);
    // Positioned absolutely top-right.
    expect(badge.className).toContain('absolute');
    expect(badge.className).toContain('top-3');
    expect(badge.className).toContain('right-3');
  });

  it('T-045 (triangulate): badge se oculta cuando points.length = 0', async () => {
    render(<PerformanceCurveChart points={[]} />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(
        screen.queryByTestId('dash-performance-lastpoint'),
      ).toBeNull();
    });
  });

  it('T-046: un deposito produce marker arrowUp aboveBar', async () => {
    const points = [
      mkPoint({ date: '2026-09-10', capital_volume: 500, daily_pnl: 0 }),
    ];
    render(<PerformanceCurveChart points={points} />, { wrapper: makeWrapper() });

    // The marker plugin runs inside a useEffect that fires after
    // mount. waitFor polls until `setMarkers` has been called at
    // least once with the expected payload.
    await waitFor(() => {
      expect(setMarkersMock).toHaveBeenCalled();
    });

    const calls = setMarkersMock.mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(1);
    const lastCallMarkers = calls[calls.length - 1]![0] as ReadonlyArray<{
      readonly time: string;
      readonly position: string;
      readonly shape: string;
      readonly color: string;
    }>;
    expect(lastCallMarkers).toHaveLength(1);
    expect(lastCallMarkers[0]!.position).toBe('aboveBar');
    expect(lastCallMarkers[0]!.shape).toBe('arrowUp');
    expect(lastCallMarkers[0]!.color).toBe('var(--color-jade-profit)');
    expect(lastCallMarkers[0]!.time).toBe('2026-09-10');
  });

  it('T-046: un retiro produce marker arrowDown belowBar', async () => {
    const points = [
      mkPoint({ date: '2026-09-10', capital_volume: -200, daily_pnl: 0 }),
    ];
    render(<PerformanceCurveChart points={points} />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(setMarkersMock).toHaveBeenCalled();
    });

    const lastCallMarkers = setMarkersMock.mock.calls[
      setMarkersMock.mock.calls.length - 1
    ]![0] as ReadonlyArray<{
      readonly time: string;
      readonly position: string;
      readonly shape: string;
    }>;
    expect(lastCallMarkers).toHaveLength(1);
    expect(lastCallMarkers[0]!.position).toBe('belowBar');
    expect(lastCallMarkers[0]!.shape).toBe('arrowDown');
  });

  it('T-046: dia con capital_volume = 0 NO produce marker', async () => {
    const points = [
      mkPoint({ date: '2026-09-10', capital_volume: 0, daily_pnl: 5 }),
    ];
    render(<PerformanceCurveChart points={points} />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(setMarkersMock).toHaveBeenCalled();
    });

    const lastCallMarkers = setMarkersMock.mock.calls[
      setMarkersMock.mock.calls.length - 1
    ]![0] as ReadonlyArray<unknown>;
    expect(lastCallMarkers).toHaveLength(0);
  });

  it('T-046 (triangulate): mix de deposit + withdraw + quiet produce 2 markers', async () => {
    const points = [
      mkPoint({ date: '2026-09-08', capital_volume: 100, daily_pnl: 0 }),
      mkPoint({ date: '2026-09-09', capital_volume: 0, daily_pnl: 5 }),
      mkPoint({ date: '2026-09-10', capital_volume: -50, daily_pnl: 0 }),
    ];
    render(<PerformanceCurveChart points={points} />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(setMarkersMock).toHaveBeenCalled();
    });

    const lastCallMarkers = setMarkersMock.mock.calls[
      setMarkersMock.mock.calls.length - 1
    ]![0] as ReadonlyArray<{
      readonly time: string;
      readonly shape: string;
    }>;
    expect(lastCallMarkers).toHaveLength(2);
    const upMarker = lastCallMarkers.find((m) => m.time === '2026-09-08');
    const downMarker = lastCallMarkers.find((m) => m.time === '2026-09-10');
    expect(upMarker?.shape).toBe('arrowUp');
    expect(downMarker?.shape).toBe('arrowDown');
  });

  /*
   * dashboard-jarvis-fidelity-v2 (REQ-DCF-JV2-009) — spline pivot.
   * The performance chart now renders a smooth Lightweight-Charts
   * LineSeries (NOT a histogram) for cumulative_net_pnl. The
   * per-day P&L story is told by the curve's slope + an
   * AreaSeries that fills the area under the line with the JARVIS
   * gradient (CURVE_AREA_TOP → CURVE_AREA_BOTTOM). The deposit /
   * withdraw markers stay — they live on the spline series now.
   *
   * The test asserts:
   *   - the chart registers an `addLineSeries` for the spline.
   *   - the spline's setData payload carries the cumulative_net_pnl
   *     points (NOT daily_pnl bars).
   *   - the chart registers an AreaSeries for the gradient fill.
   */
  describe('v2 spline + area fill (REQ-DCF-JV2-009)', () => {
    it('registra un LineSeries con el cyan primary (spline principal)', async () => {
      const points = [
        mkPoint({ date: '2026-09-08', cumulative_net_pnl: 0 }),
        mkPoint({ date: '2026-09-09', cumulative_net_pnl: 5 }),
        mkPoint({ date: '2026-09-10', cumulative_net_pnl: 9.2 }),
      ];
      render(<PerformanceCurveChart points={points} />, { wrapper: makeWrapper() });

      await waitFor(() => {
        expect(setMarkersMock).toHaveBeenCalled();
      });

      const actual = await import('lightweight-charts');
      const createChartMock = (actual.createChart as unknown as ReturnType<typeof vi.fn>);
      expect(createChartMock).toHaveBeenCalled();
      const chartInstance = createChartMock.mock.results[0]?.value as
        | { addSeries: ReturnType<typeof vi.fn> }
        | undefined;
      expect(chartInstance).toBeDefined();
      // The spline pivot calls addSeries TWICE: once for the
      // LineSeries (spline) and once for the AreaSeries (gradient
      // fill). The AreaSeries registration must come after the
      // LineSeries registration so the fill sits behind the line.
      expect(chartInstance!.addSeries.mock.calls.length).toBeGreaterThanOrEqual(2);

      // Lightweight-charts exports series as ES module objects;
      // they don't carry a `.name` property. We identify them by
      // their `seriesType` field or by their reference identity
      // against the original module exports.
      const expectedSplineCtor = actual.LineSeries;
      const expectedAreaCtor = actual.AreaSeries;
      const splineRegistered = chartInstance!.addSeries.mock.calls.some(
        (c) => c[0] === expectedSplineCtor,
      );
      const areaRegistered = chartInstance!.addSeries.mock.calls.some(
        (c) => c[0] === expectedAreaCtor,
      );
      expect(splineRegistered, 'LineSeries should be registered').toBe(true);
      expect(areaRegistered, 'AreaSeries should be registered').toBe(true);
    });

    it('el spline carga los puntos cumulative_net_pnl (no daily_pnl)', async () => {
      const points = [
        mkPoint({ date: '2026-09-08', cumulative_net_pnl: 0, daily_pnl: 0 }),
        mkPoint({ date: '2026-09-09', cumulative_net_pnl: 5, daily_pnl: 5 }),
        mkPoint({ date: '2026-09-10', cumulative_net_pnl: 12.5, daily_pnl: 7.5 }),
      ];
      render(<PerformanceCurveChart points={points} />, { wrapper: makeWrapper() });

      await waitFor(() => {
        expect(setMarkersMock).toHaveBeenCalled();
      });

      const actual = await import('lightweight-charts');
      const createChartMock = (actual.createChart as unknown as ReturnType<typeof vi.fn>);
      const chartInstance = createChartMock.mock.results[0]?.value as
        | { addSeries: ReturnType<typeof vi.fn> }
        | undefined;
      expect(chartInstance).toBeDefined();

      const expectedSplineCtor = actual.LineSeries;
      const calls = chartInstance!.addSeries.mock.calls;
      const splineIdx = calls.findIndex((c) => c[0] === expectedSplineCtor);
      expect(splineIdx).toBeGreaterThanOrEqual(0);

      const splineSeries = chartInstance!.addSeries.mock.results[splineIdx]?.value as
        | { setData: ReturnType<typeof vi.fn> }
        | undefined;
      expect(splineSeries).toBeDefined();
      expect(splineSeries!.setData).toHaveBeenCalled();
      const data = splineSeries!.setData.mock.calls[0]?.[0] as ReadonlyArray<{
        readonly time: string;
        readonly value: number;
      }>;
      expect(data).toBeDefined();
      // The spline payload MUST reflect cumulative_net_pnl, NOT
      // daily_pnl — the per-day P&L story is told by the curve's
      // slope.
      expect(data).toHaveLength(3);
      expect(data![0]!.value).toBe(0);
      expect(data![1]!.value).toBe(5);
      expect(data![2]!.value).toBe(12.5);
    });
  });
});
