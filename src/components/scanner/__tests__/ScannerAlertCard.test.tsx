/*
 * ScannerAlertCard — minimal contract test.
 *
 * Locks the three observable behaviours the spec requires:
 *   1. Pair + expiration render in the card header.
 *   2. The direction badge shows the alert's direction ("PUT").
 *   3. "Cargar en Diario" button calls
 *      ``useNewTradeDrawer.openWithPrefill`` with the right payload.
 *
 * Strategy: render the card with a known PUT alert, then watch the
 * store for the side effect on click. The button is the only thing
 * we need to interact with — everything else is static text.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ScannerAlertCard, formatTriggerReason } from '../ScannerAlertCard';
import type { ScannerAlert } from '../../../features/scanner/useScannerAlerts';
import { useNewTradeDrawer } from '../../../stores/useNewTradeDrawer';

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

beforeEach(() => {
  useNewTradeDrawer.setState({ isOpen: false, prefill: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ScannerAlertCard', () => {
  it('renders the pair + expiration for a PUT alert', () => {
    render(<ScannerAlertCard alert={makeAlert({ pair: 'GBP/USD' })} />);
    // The pair is rendered in the header. The testid-bearing card
    // also carries the pair for easy querying.
    expect(screen.getByTestId('scanner-alert-card').getAttribute('data-pair')).toBe(
      'GBP/USD',
    );
    // Expiration is on the right edge.
    expect(screen.getByText('5min')).toBeInTheDocument();
  });

  it('renders the PUT direction badge with the correct text', () => {
    render(<ScannerAlertCard alert={makeAlert({ direction: 'PUT' })} />);
    const badge = screen.getByTestId('scanner-alert-direction');
    expect(badge.textContent).toBe('PUT');
    expect(screen.getByTestId('scanner-alert-card').getAttribute('data-direction')).toBe(
      'PUT',
    );
  });

  it('renders the CALL direction badge with the correct text', () => {
    render(<ScannerAlertCard alert={makeAlert({ direction: 'CALL' })} />);
    const badge = screen.getByTestId('scanner-alert-direction');
    expect(badge.textContent).toBe('CALL');
  });

  it('renders the "Cargar en Diario" button', () => {
    render(<ScannerAlertCard alert={makeAlert()} />);
    expect(screen.getByTestId('scanner-alert-cta')).toBeInTheDocument();
    expect(screen.getByTestId('scanner-alert-cta').textContent).toContain(
      'Cargar en Diario',
    );
  });

  it('clicking the CTA opens the drawer with the right prefill', () => {
    const openSpy = vi.spyOn(useNewTradeDrawer.getState(), 'openWithPrefill');
    render(
      <ScannerAlertCard
        alert={makeAlert({ pair: 'EUR/USD', direction: 'PUT' })}
      />,
    );
    fireEvent.click(screen.getByTestId('scanner-alert-cta'));
    expect(openSpy).toHaveBeenCalledWith({
      pair: 'EUR/USD',
      direction: 'PUT',
    });
  });

  it('formatTriggerReason produces the spec string for PUT', () => {
    expect(
      formatTriggerReason(
        makeAlert({
          direction: 'PUT',
          indicators: { stoch_value: 92.4, price_distance_ema: '-15 pips' },
        }),
      ),
    ).toBe('Stoch > 90 · Precio < EMA 200');
  });

  it('formatTriggerReason produces the spec string for CALL', () => {
    expect(
      formatTriggerReason(
        makeAlert({
          direction: 'CALL',
          indicators: { stoch_value: 8.1, price_distance_ema: '+22 pips' },
        }),
      ),
    ).toBe('Stoch < 10 · Precio > EMA 200');
  });
});
