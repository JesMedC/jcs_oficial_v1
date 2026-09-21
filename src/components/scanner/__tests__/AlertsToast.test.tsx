/*
 * AlertsToast — auto-dismiss + manual dismiss contract.
 *
 * Renders the toast cluster with `useScannerAlerts` mocked (the hook
 * is exercised separately) and asserts:
 *   - An alert shows up in the stack with the right direction badge.
 *   - The auto-dismiss timer removes the toast after the 8s budget.
 *   - The × button dismisses a toast immediately.
 *
 * We use Vitest's fake timers so the 8s wait is instant.
 */
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ScannerAlert } from '../../../features/scanner/useScannerAlerts';

vi.mock('../../../features/scanner/useScannerAlerts', async () => {
  return {
    useScannerAlerts: vi.fn(),
  };
});

// Imported AFTER the mock so the mocked module is what gets resolved.
const { useScannerAlerts } = await import('../../../features/scanner/useScannerAlerts');
const { AlertsToast } = await import('../AlertsToast');

function makeAlert(overrides: Partial<ScannerAlert> = {}): ScannerAlert {
  return {
    pair: 'EUR/USD',
    direction: 'PUT',
    investment_amount_calc: '1% del account_balance actual',
    expiration_time: '5min',
    timestamp: '2026-09-14T16:57:32Z',
    indicators: {
      stoch_value: 92.4,
      price_distance_ema: '-15 pips',
    },
    ...overrides,
  };
}

let mockAlerts: ScannerAlert[] = [];
let mockClear: () => void = () => {};

beforeEach(() => {
  vi.useFakeTimers();
  mockAlerts = [];
  mockClear = vi.fn();
  (useScannerAlerts as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
    alerts: mockAlerts,
    clear: mockClear,
    connected: true,
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('AlertsToast', () => {
  it('renders nothing when there are no alerts', () => {
    const { container } = render(<AlertsToast />);
    expect(container.querySelector('[data-testid="scanner-toast"]')).toBeNull();
  });

  it('renders one toast per incoming alert with the correct badge', () => {
    mockAlerts = [
      makeAlert({ pair: 'EUR/USD', direction: 'PUT' }),
      makeAlert({
        pair: 'GBP/USD',
        direction: 'CALL',
        timestamp: '2026-09-14T16:58:00Z',
        indicators: { stoch_value: 12.3, price_distance_ema: '+8 pips' },
      }),
    ];
    render(<AlertsToast />);
    const toasts = screen.getAllByTestId('scanner-toast');
    expect(toasts).toHaveLength(2);
    expect(toasts[0]?.getAttribute('data-direction')).toBe('PUT');
    expect(toasts[1]?.getAttribute('data-direction')).toBe('CALL');
    // Pair + indicator labels visible (use within-scoped queries to
    // avoid collisions across toasts).
    expect(screen.getAllByText('EUR/USD')[0]).toBeInTheDocument();
    expect(screen.getAllByText('GBP/USD')[0]).toBeInTheDocument();
    expect(screen.getAllByText('92.4')[0]).toBeInTheDocument();
    expect(screen.getAllByText('12.3')[0]).toBeInTheDocument();
    expect(screen.getAllByText('-15 pips')[0]).toBeInTheDocument();
    expect(screen.getAllByText('+8 pips')[0]).toBeInTheDocument();
  });

  it('caps visible toasts at 3', () => {
    // useScannerAlerts prepends incoming alerts, so the hook's array
    // is newest-first. The first 3 entries are the most recent.
    mockAlerts = [
      makeAlert({ pair: 'AUD/USD', timestamp: '2026-09-14T17:00:00Z' }),
      makeAlert({ pair: 'USD/JPY', timestamp: '2026-09-14T16:59:00Z' }),
      makeAlert({ pair: 'GBP/USD', timestamp: '2026-09-14T16:58:00Z' }),
      makeAlert({ pair: 'EUR/USD', timestamp: '2026-09-14T16:57:00Z' }),
    ];
    render(<AlertsToast />);
    const toasts = screen.getAllByTestId('scanner-toast');
    expect(toasts).toHaveLength(3);
    expect(toasts[0]?.textContent).toContain('AUD/USD');
    expect(toasts[1]?.textContent).toContain('USD/JPY');
    expect(toasts[2]?.textContent).toContain('GBP/USD');
    // EUR/USD is the oldest → not in the visible cap.
    expect(screen.queryAllByText('EUR/USD')).toHaveLength(0);
  });

  it('auto-dismisses a toast after 8s', () => {
    mockAlerts = [makeAlert({ pair: 'EUR/USD' })];
    const { rerender } = render(<AlertsToast />);
    expect(screen.getByTestId('scanner-toast')).toBeInTheDocument();
    // Advance fake clock past 8s and re-render to flush state.
    act(() => {
      vi.advanceTimersByTime(8500);
    });
    rerender(<AlertsToast />);
    expect(screen.queryByTestId('scanner-toast')).toBeNull();
  });

  it('the dismiss × button removes the toast immediately', () => {
    mockAlerts = [makeAlert({ pair: 'EUR/USD' })];
    render(<AlertsToast />);
    const dismissBtn = screen.getByRole('button', { name: 'Dismiss alert' });
    act(() => {
      dismissBtn.click();
    });
    expect(screen.queryByTestId('scanner-toast')).toBeNull();
  });

  it('the "Limpiar" button clears all alerts', () => {
    mockAlerts = [
      makeAlert({ pair: 'EUR/USD' }),
      makeAlert({ pair: 'GBP/USD', timestamp: '2026-09-14T16:58:00Z' }),
    ];
    render(<AlertsToast />);
    const clearBtn = screen.getByRole('button', { name: 'Dismiss all scanner alerts' });
    act(() => {
      clearBtn.click();
    });
    expect(mockClear).toHaveBeenCalledOnce();
  });
});