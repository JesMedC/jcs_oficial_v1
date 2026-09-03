/*
 * p0e.5 — trades API tests.
 *
 * Verifica que ``listTradesApi`` envíe los query params esperados y
 * que ``openTradeApi`` / ``closeTradeApi`` posteen las shapes
 * correctas para los dos tipos (FOREX + BINARY). El ``apiClient``
 * se mockea vía ``vi.mock`` siguiendo el patrón de
 * ``src/features/payments/__tests__/api.test.ts`` y
 * ``src/features/accounts/__tests__/api.test.ts``.
 *
 * Los tests no tocan la red: el backend p0e.4 puede no estar
 * desplegado todavía, y la lógica de estas funciones es la forma
 * del request — no la respuesta.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { apiClient } from '../../../lib/api/client';
import { closeTradeApi, listTradesApi, openTradeApi } from '../api';

const mockedGet = apiClient.get as unknown as ReturnType<typeof vi.fn>;
const mockedPost = apiClient.post as unknown as ReturnType<typeof vi.fn>;

describe('trades API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listTradesApi serializes all query params (account_id + status + type + pagination)', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { items: [], total: 0, skip: 10, limit: 25 },
    });
    await listTradesApi({
      account_id: 'acc-1',
      status: 'OPEN',
      type: 'FOREX',
      skip: 10,
      limit: 25,
    });
    expect(mockedGet).toHaveBeenCalledWith('/trades', {
      params: {
        account_id: 'acc-1',
        status: 'OPEN',
        type: 'FOREX',
        skip: 10,
        limit: 25,
      },
    });
  });

  it('listTradesApi works without params (empty filter envelope)', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { items: [], total: 0, skip: 0, limit: 50 },
    });
    await listTradesApi();
    expect(mockedGet).toHaveBeenCalledWith('/trades', {
      params: {},
    });
  });

  it('openTradeApi posts a FOREX payload with all ForexFields', async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        id: 'trade-1',
        user_id: 'u-1',
        account_id: 'acc-1',
        instrument: 'EURUSD',
        type: 'FOREX',
        status: 'OPEN',
        opened_at: '2026-09-02T00:00:00Z',
        closed_at: null,
        strategy_id: null,
        emotional_tags: null,
        pre_trade_notes: null,
        post_trade_notes: null,
        followed_plan: null,
        mistakes: null,
        screenshots: null,
        pair: 'EUR/USD',
        lot_size: '0.10',
        direction: 'LONG',
        entry_price: '1.08500',
        stop_loss: '1.08000',
        take_profit: '1.09000',
      },
    });
    await openTradeApi({
      account_id: 'acc-1',
      instrument: 'EURUSD',
      type: 'FOREX',
      pair: 'EUR/USD',
      lot_size: '0.10',
      direction: 'LONG',
      entry_price: '1.08500',
      stop_loss: '1.08000',
      take_profit: '1.09000',
    });
    expect(mockedPost).toHaveBeenCalledWith('/trades', {
      account_id: 'acc-1',
      instrument: 'EURUSD',
      type: 'FOREX',
      pair: 'EUR/USD',
      lot_size: '0.10',
      direction: 'LONG',
      entry_price: '1.08500',
      stop_loss: '1.08000',
      take_profit: '1.09000',
    });
  });

  it('openTradeApi posts a BINARY payload with all BinaryFields', async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        id: 'trade-2',
        user_id: 'u-1',
        account_id: 'acc-1',
        instrument: 'EURUSD',
        type: 'BINARY',
        status: 'OPEN',
        opened_at: '2026-09-02T00:00:00Z',
        closed_at: null,
        strategy_id: null,
        emotional_tags: ['FOMO'],
        pre_trade_notes: 'Setup claro',
        post_trade_notes: null,
        followed_plan: null,
        mistakes: null,
        screenshots: null,
        investment_usd: '10.00',
        payout_pct: '85.00',
        expiration_seconds: 60,
        direction: 'CALL',
      },
    });
    await openTradeApi({
      account_id: 'acc-1',
      instrument: 'EURUSD',
      type: 'BINARY',
      investment_usd: '10.00',
      payout_pct: '85.00',
      expiration_seconds: 60,
      direction: 'CALL',
      emotional_tags: ['FOMO'],
      pre_trade_notes: 'Setup claro',
    });
    expect(mockedPost).toHaveBeenCalledWith('/trades', {
      account_id: 'acc-1',
      instrument: 'EURUSD',
      type: 'BINARY',
      investment_usd: '10.00',
      payout_pct: '85.00',
      expiration_seconds: 60,
      direction: 'CALL',
      emotional_tags: ['FOMO'],
      pre_trade_notes: 'Setup claro',
    });
  });

  it('closeTradeApi posts a FOREX close (exit_price + journal triple)', async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        id: 'trade-1',
        user_id: 'u-1',
        account_id: 'acc-1',
        instrument: 'EURUSD',
        type: 'FOREX',
        status: 'CLOSED_WIN',
        opened_at: '2026-09-02T00:00:00Z',
        closed_at: '2026-09-02T01:00:00Z',
        strategy_id: null,
        emotional_tags: null,
        pre_trade_notes: null,
        post_trade_notes: 'Salida limpia',
        followed_plan: true,
        mistakes: null,
        screenshots: null,
        pair: 'EUR/USD',
        lot_size: '0.10',
        direction: 'LONG',
        entry_price: '1.08500',
        stop_loss: '1.08000',
        take_profit: '1.09000',
        exit_price: '1.09000',
        pnl_usd: '50.00',
      },
    });
    await closeTradeApi('trade-1', {
      exit_price: '1.09000',
      post_trade_notes: 'Salida limpia',
      followed_plan: true,
    });
    expect(mockedPost).toHaveBeenCalledWith('/trades/trade-1/close', {
      exit_price: '1.09000',
      post_trade_notes: 'Salida limpia',
      followed_plan: true,
    });
  });

  it('closeTradeApi posts a BINARY close (outcome WIN/LOSS)', async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        id: 'trade-2',
        user_id: 'u-1',
        account_id: 'acc-1',
        instrument: 'EURUSD',
        type: 'BINARY',
        status: 'CLOSED_LOSS',
        opened_at: '2026-09-02T00:00:00Z',
        closed_at: '2026-09-02T00:01:00Z',
        strategy_id: null,
        emotional_tags: null,
        pre_trade_notes: null,
        post_trade_notes: null,
        followed_plan: null,
        mistakes: 'Entré sin setup',
        screenshots: null,
        investment_usd: '10.00',
        payout_pct: '85.00',
        expiration_seconds: 60,
        direction: 'CALL',
        pnl_usd: '-10.00',
      },
    });
    await closeTradeApi('trade-2', {
      outcome: 'LOSS',
      mistakes: 'Entré sin setup',
    });
    expect(mockedPost).toHaveBeenCalledWith('/trades/trade-2/close', {
      outcome: 'LOSS',
      mistakes: 'Entré sin setup',
    });
  });
});
