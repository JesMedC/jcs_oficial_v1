/*
 * useScannerAlerts — minimal contract test.
 *
 * Verifies the three observable surface items:
 *   - `alerts` updates when the WS delivers a valid frame
 *   - `clear()` empties the list
 *   - `connected` flips true on `open` and false on `close`
 *
 * Strategy: replace the global `WebSocket` constructor with a fake
 * that records its handlers and lets the test fire them on demand.
 * No real network involved.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ScannerAlert } from '../useScannerAlerts';
import { useScannerAlerts } from '../useScannerAlerts';

interface FakeSocket {
  url: string;
  readyState: number;
  onopen: ((ev: Event) => void) | null;
  onmessage: ((ev: MessageEvent<string>) => void) | null;
  onclose: ((ev: CloseEvent) => void) | null;
  onerror: ((ev: Event) => void) | null;
  close: () => void;
  send: () => void;
}

let lastFake: FakeSocket | null = null;
const created: FakeSocket[] = [];

function buildFake(): FakeSocket {
  const fake: FakeSocket = {
    url: '',
    readyState: 1,
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null,
    close: () => {
      fake.readyState = 3;
      if (fake.onclose !== null) {
        fake.onclose(new CloseEvent('close'));
      }
    },
    send: () => {},
  };
  created.push(fake);
  lastFake = fake;
  return fake;
}

const originalWebSocket = globalThis.WebSocket;

beforeEach(() => {
  created.length = 0;
  lastFake = null;
  // Minimal stand-in for the browser WebSocket constructor.
  globalThis.WebSocket = vi.fn((url: string) => {
    const fake = buildFake();
    fake.url = url;
    return fake as unknown as WebSocket;
  }) as unknown as typeof WebSocket;
  // Make sure sessionStorage has a fake access token.
  sessionStorage.setItem('jcs.auth.access_token', 'fake-jwt');
});

afterEach(() => {
  globalThis.WebSocket = originalWebSocket;
  sessionStorage.clear();
  vi.clearAllTimers();
});

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

describe('useScannerAlerts', () => {
  it('appends incoming alerts to the list', async () => {
    const { result } = renderHook(() => useScannerAlerts());

    // Wait for the WS to be constructed and the onmessage handler attached.
    await waitFor(() => {
      expect(lastFake).not.toBeNull();
    });
    const fake = lastFake as unknown as FakeSocket;
    // Simulate open + message.
    act(() => {
      if (fake.onopen) fake.onopen(new Event('open'));
    });
    await waitFor(() => {
      expect(result.current.connected).toBe(true);
    });

    const alert = makeAlert();
    act(() => {
      if (fake.onmessage) {
        fake.onmessage(
          new MessageEvent<string>('message', { data: JSON.stringify(alert) }),
        );
      }
    });
    await waitFor(() => {
      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0]?.pair).toBe('EUR/USD');
    });
  });

  it('ignores malformed frames', async () => {
    const { result } = renderHook(() => useScannerAlerts());
    await waitFor(() => expect(lastFake).not.toBeNull());
    const fake = lastFake as unknown as FakeSocket;

    act(() => {
      if (fake.onopen) fake.onopen(new Event('open'));
    });
    act(() => {
      if (fake.onmessage) {
        fake.onmessage(new MessageEvent<string>('message', { data: 'not json' }));
        // Frame with the right shape but wrong field type — must be rejected.
        fake.onmessage(
          new MessageEvent<string>('message', {
            data: JSON.stringify({ pair: 123 }),
          }),
        );
      }
    });
    expect(result.current.alerts).toHaveLength(0);
  });

  it('drops the ready ack frame silently', async () => {
    const { result } = renderHook(() => useScannerAlerts());
    await waitFor(() => expect(lastFake).not.toBeNull());
    const fake = lastFake as unknown as FakeSocket;
    act(() => {
      if (fake.onopen) fake.onopen(new Event('open'));
    });
    act(() => {
      if (fake.onmessage) {
        fake.onmessage(
          new MessageEvent<string>('message', { data: '{"event":"ready"}' }),
        );
      }
    });
    expect(result.current.alerts).toHaveLength(0);
    expect(result.current.connected).toBe(true);
  });

  it('clear() empties the alert list', async () => {
    const { result } = renderHook(() => useScannerAlerts());
    await waitFor(() => expect(lastFake).not.toBeNull());
    const fake = lastFake as unknown as FakeSocket;
    act(() => {
      if (fake.onopen) fake.onopen(new Event('open'));
    });
    act(() => {
      if (fake.onmessage) {
        fake.onmessage(
          new MessageEvent<string>('message', {
            data: JSON.stringify(makeAlert({ pair: 'EUR/USD' })),
          }),
        );
        fake.onmessage(
          new MessageEvent<string>('message', {
            data: JSON.stringify(makeAlert({ pair: 'GBP/USD' })),
          }),
        );
      }
    });
    await waitFor(() => expect(result.current.alerts).toHaveLength(2));
    act(() => {
      result.current.clear();
    });
    await waitFor(() => expect(result.current.alerts).toHaveLength(0));
  });

  it('caps the alert list to 20 entries', async () => {
    const { result } = renderHook(() => useScannerAlerts());
    await waitFor(() => expect(lastFake).not.toBeNull());
    const fake = lastFake as unknown as FakeSocket;
    act(() => {
      if (fake.onopen) fake.onopen(new Event('open'));
    });
    act(() => {
      if (fake.onmessage) {
        for (let i = 0; i < 25; i++) {
          fake.onmessage(
            new MessageEvent<string>('message', {
              data: JSON.stringify(makeAlert({ pair: `EUR/USD ${i}` })),
            }),
          );
        }
      }
    });
    await waitFor(() => expect(result.current.alerts).toHaveLength(20));
  });

  it('connected flips false on close', async () => {
    const { result } = renderHook(() => useScannerAlerts());
    await waitFor(() => expect(lastFake).not.toBeNull());
    const fake = lastFake as unknown as FakeSocket;
    act(() => {
      if (fake.onopen) fake.onopen(new Event('open'));
    });
    await waitFor(() => expect(result.current.connected).toBe(true));
    act(() => {
      fake.close();
    });
    await waitFor(() => expect(result.current.connected).toBe(false));
  });
});