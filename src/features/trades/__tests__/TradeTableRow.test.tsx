/*
 * Work unit (B) — TradeTableRow status-based row tint.
 *
 * Pins the row-level tint ladder so the operations log surfaces the
 * WIN/LOSS distinction at a glance without relying solely on the
 * Spanish badge label (Ganada / Perdida). The existing
 * ``TradeStatusBadge`` is preserved so color-blind users keep the
 * text cue; the row background adds a redundant visual channel.
 *
 * Ladder (defined in TradeTableRow.tsx):
 *   - CLOSED_WIN        → bg-profit/10, hover:bg-profit/15
 *   - CLOSED_LOSS       → bg-loss/10,   hover:bg-loss/15
 *   - OPEN              → no tint (legacy hover:bg-primary/5)
 *   - CLOSED_BREAK      → no tint (legacy hover:bg-primary/5)
 *   - FUND/WITHDRAW     → always neutral — capital movements are
 *     not "wins" or "losses" even when the status literal says so.
 *     Type wins over status.
 *
 * Tailwind compiles each utility into a single CSS rule, so we can
 * target the literal class tokens via toMatch(/bg-profit/) without
 * needing to render CSS through the DOM (jsdom's getComputedStyle is
 * incomplete for utility-class opacity tokens).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TradeTableRow } from '../TradeTableRow';
import type { AccountOut } from '../../accounts/types';
import type { TradeOut } from '../types';

const fakeAccount: AccountOut = {
  id: 'a1',
  user_id: 'u1',
  workspace_id: 'ws-1',
  broker_name: 'Test Broker',
  name: 'Test Account',
  type: 'FOREX',
  balance_usd: '1000.00',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const baseTrade: TradeOut = {
  id: 'row-trade',
  user_id: 'u1',
  account_id: 'a1',
  instrument: 'EURUSD',
  type: 'FOREX',
  status: 'CLOSED_WIN',
  opened_at: '2026-01-01T13:00:00.000Z',
  closed_at: '2026-01-01T14:00:00.000Z',
  strategy_id: null,
  emotional_tags: null,
  pre_trade_notes: null,
  post_trade_notes: null,
  followed_plan: null,
  mistakes: null,
  screenshots: null,
  pnl_usd: '50.00',
  pair: 'EURUSD',
  lot_size: '0.10',
  direction: 'LONG',
  entry_price: '1.0800',
  exit_price: '1.0850',
  stop_loss: null,
  take_profit: null,
  risk_amount_usd: null,
  risk_pct: null,
  r_multiple: '1.0',
  interest: 'PLAN',
  analysis_image_url: null,
  close_image_url: null,
};

const accountsById = new Map<string, AccountOut>([['a1', fakeAccount]]);

function renderRow(trade: TradeOut) {
  return render(
    <table>
      <tbody>
        <TradeTableRow
          trade={trade}
          balance={null}
          accountsById={accountsById}
        />
      </tbody>
    </table>,
  );
}

describe('TradeTableRow — tinte por status (B)', () => {
  it('CLOSED_WIN aplica bg-profit al <tr>', () => {
    renderRow({ ...baseTrade, id: 'win-trade', status: 'CLOSED_WIN' });
    const row = screen.getByTestId('trade-row-win-trade');
    expect(row.className).toMatch(/\bbg-profit\//);
    expect(row.className).not.toMatch(/\bbg-loss\//);
  });

  it('CLOSED_LOSS aplica bg-loss al <tr>', () => {
    renderRow({ ...baseTrade, id: 'loss-trade', status: 'CLOSED_LOSS', pnl_usd: '-30.00' });
    const row = screen.getByTestId('trade-row-loss-trade');
    expect(row.className).toMatch(/\bbg-loss\//);
    expect(row.className).not.toMatch(/\bbg-profit\//);
  });

  it('OPEN se renderiza neutro (sin bg-profit ni bg-loss)', () => {
    renderRow({ ...baseTrade, id: 'open-trade', status: 'OPEN', closed_at: null, pnl_usd: null });
    const row = screen.getByTestId('trade-row-open-trade');
    expect(row.className).not.toMatch(/\bbg-profit\//);
    expect(row.className).not.toMatch(/\bbg-loss\//);
  });

  it('CLOSED_BREAK se renderiza neutro (sin bg-profit ni bg-loss)', () => {
    renderRow({ ...baseTrade, id: 'break-trade', status: 'CLOSED_BREAK', pnl_usd: '0.00' });
    const row = screen.getByTestId('trade-row-break-trade');
    expect(row.className).not.toMatch(/\bbg-profit\//);
    expect(row.className).not.toMatch(/\bbg-loss\//);
  });

  it('FUND con CLOSED_WIN se renderiza neutro (el type gana sobre el status)', () => {
    renderRow({ ...baseTrade, id: 'fund-win', type: 'FUND', status: 'CLOSED_WIN' });
    const row = screen.getByTestId('trade-row-fund-win');
    expect(row.className).not.toMatch(/\bbg-profit\//);
    expect(row.className).not.toMatch(/\bbg-loss\//);
  });

  it('WITHDRAW con CLOSED_WIN se renderiza neutro (el type gana sobre el status)', () => {
    renderRow({ ...baseTrade, id: 'withdraw-win', type: 'WITHDRAW', status: 'CLOSED_WIN' });
    const row = screen.getByTestId('trade-row-withdraw-win');
    expect(row.className).not.toMatch(/\bbg-profit\//);
    expect(row.className).not.toMatch(/\bbg-loss\//);
  });

  it('FUND con CLOSED_LOSS se renderiza neutro (el type gana sobre el status)', () => {
    renderRow({ ...baseTrade, id: 'fund-loss', type: 'FUND', status: 'CLOSED_LOSS' });
    const row = screen.getByTestId('trade-row-fund-loss');
    expect(row.className).not.toMatch(/\bbg-profit\//);
    expect(row.className).not.toMatch(/\bbg-loss\//);
  });

  it('CLOSED_WIN mantiene border-b border-borderJade y transition-colors', () => {
    renderRow({ ...baseTrade, id: 'win-frame', status: 'CLOSED_WIN' });
    const row = screen.getByTestId('trade-row-win-frame');
    expect(row.className).toMatch(/\bborder-b\b/);
    expect(row.className).toMatch(/\bborder-borderJade\b/);
    expect(row.className).toMatch(/\btransition-colors\b/);
  });
});