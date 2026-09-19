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

  /*
   * Work unit (C) — full-row text tint. The previous commit (B)
   * painted only the <tr> background (bg-loss/10 / bg-profit/10);
   * the screenshot showed PERDIDA rows still rendering with mostly
   * white/cyan text because every <td> carries its own
   * text-text-primary / text-text-secondary / text-primary which
   * override the row signal. The user wants the WHOLE row tinted,
   * not just the background — every text cell must carry
   * text-loss (CLOSED_LOSS) or text-profit (CLOSED_WIN), while
   * TradeStatusBadge / TradeTypeBadge / SessionPill / close-button
   * cells keep their own palette (the badge already carries the
   * Spanish label so color-blind users keep the text cue).
   *
   * Helper below collects the "tintable" tds: every <td> except
   *   - the TradeStatusBadge cell (carries its own bg/text signal),
   *   - the TradeTypeBadge cell (carries its own bg/text signal),
   *   - the SessionPill cell — detected by an inner span whose
   *     data-testid is one of the four band literals (ASIA / LONDON /
   *     NEW_YORK / SYDNEY). The em-dash placeholder path uses
   *     ``trade-session-none-${id}`` instead and IS tintable (the
   *     spec says the missing-session placeholder must also turn
   *     red/green so a CLOSED_LOSS row stays legible even with no
   *     session pill).
   *   - the close-button cell — always the LAST td in the row.
   *     For CLOSED statuses the button doesn't render but the
   *     cell is still reserved for it and stays untinted (its own
   *     ``text-primary`` colour is for the button's hover state).
   *     Filtering by position keeps the test stable without
   *     adding new data-testids to the component.
   */
  function tintableTds(tradeId: string): readonly HTMLElement[] {
    const row = screen.getByTestId(`trade-row-${tradeId}`);
    const tds = Array.from(row.querySelectorAll('td'));
    return tds.slice(0, -1).filter((td) => {
      if (td.querySelector('[data-testid^="trade-status-"]')) return false;
      if (td.querySelector('[data-testid^="trade-type-"]')) return false;
      if (
        td.querySelector(
          '[data-testid="trade-session-ASIA"], [data-testid="trade-session-LONDON"], [data-testid="trade-session-NEW_YORK"], [data-testid="trade-session-SYDNEY"]',
        )
      ) {
        return false;
      }
      return true;
    });
  }

  it('CLOSED_LOSS tiñe de rojo (text-loss) cada celda de texto del <tr>', () => {
    renderRow({ ...baseTrade, id: 'loss-tint', status: 'CLOSED_LOSS', pnl_usd: '-30.00' });
    const tds = tintableTds('loss-tint');
    expect(tds.length).toBeGreaterThan(0);
    for (const td of tds) {
      expect(td.className).toMatch(/\btext-loss\b/);
    }
  });

  it('CLOSED_WIN tiñe de verde (text-profit) cada celda de texto del <tr>', () => {
    renderRow({ ...baseTrade, id: 'win-tint', status: 'CLOSED_WIN' });
    const tds = tintableTds('win-tint');
    expect(tds.length).toBeGreaterThan(0);
    for (const td of tds) {
      expect(td.className).toMatch(/\btext-profit\b/);
    }
  });

  it('OPEN no aplica text-loss/text-profit a las celdas de texto', () => {
    renderRow({ ...baseTrade, id: 'open-tint', status: 'OPEN', closed_at: null, pnl_usd: null });
    const tds = tintableTds('open-tint');
    expect(tds.length).toBeGreaterThan(0);
    for (const td of tds) {
      expect(td.className).not.toMatch(/\btext-loss\b/);
      expect(td.className).not.toMatch(/\btext-profit\b/);
    }
  });

  it('CLOSED_BREAK no aplica text-loss/text-profit a las celdas de texto', () => {
    renderRow({ ...baseTrade, id: 'break-tint', status: 'CLOSED_BREAK', pnl_usd: '0.00' });
    const tds = tintableTds('break-tint');
    expect(tds.length).toBeGreaterThan(0);
    for (const td of tds) {
      expect(td.className).not.toMatch(/\btext-loss\b/);
      expect(td.className).not.toMatch(/\btext-profit\b/);
    }
  });

  it('FUND no aplica tinte de status a las celdas de texto (el type gana)', () => {
    renderRow({ ...baseTrade, id: 'fund-tint', type: 'FUND', status: 'CLOSED_WIN' });
    // FUND rows carry a value-driven pnlColor on the lot/investment
    // cell (pnlColor(capitalAmount) — a deposit is positive so the
    // cell legitimately paints green). That's NOT a status-driven
    // tint, it's the existing value signal. So we only assert on
    // cells that are pnlColor-free: date, instrument, account name.
    // If textTintClass were applied to FUND those cells would carry
    // text-profit from the row tint, which is exactly what must NOT
    // happen because type wins over status.
    const dateCell = screen.getByTestId('trade-row-fund-tint').children[0] as HTMLElement;
    const instrumentCell = screen.getByTestId('trade-row-fund-tint').children[4] as HTMLElement;
    const accountCell = screen.getByTestId(`trade-account-fund-tint`);
    expect(dateCell.className).not.toMatch(/\btext-loss\b/);
    expect(dateCell.className).not.toMatch(/\btext-profit\b/);
    expect(instrumentCell.className).not.toMatch(/\btext-loss\b/);
    expect(instrumentCell.className).not.toMatch(/\btext-profit\b/);
    expect(accountCell.className).not.toMatch(/\btext-loss\b/);
    expect(accountCell.className).not.toMatch(/\btext-profit\b/);
  });

  it('WITHDRAW no aplica tinte de status a las celdas de texto (el type gana)', () => {
    renderRow({ ...baseTrade, id: 'withdraw-tint', type: 'WITHDRAW', status: 'CLOSED_LOSS' });
    // Same reasoning as the FUND case — value-driven pnlColor on
    // the amount cell is fine, status-driven row tint must NOT leak
    // into the date / instrument / account columns.
    const dateCell = screen.getByTestId('trade-row-withdraw-tint').children[0] as HTMLElement;
    const instrumentCell = screen.getByTestId('trade-row-withdraw-tint').children[4] as HTMLElement;
    const accountCell = screen.getByTestId(`trade-account-withdraw-tint`);
    expect(dateCell.className).not.toMatch(/\btext-loss\b/);
    expect(dateCell.className).not.toMatch(/\btext-profit\b/);
    expect(instrumentCell.className).not.toMatch(/\btext-loss\b/);
    expect(instrumentCell.className).not.toMatch(/\btext-profit\b/);
    expect(accountCell.className).not.toMatch(/\btext-loss\b/);
    expect(accountCell.className).not.toMatch(/\btext-profit\b/);
  });

  it('CLOSED_LOSS preserva el tinte de fondo bg-loss/10 en el <tr> (background + texto)', () => {
    renderRow({ ...baseTrade, id: 'loss-bg', status: 'CLOSED_LOSS', pnl_usd: '-30.00' });
    const row = screen.getByTestId('trade-row-loss-bg');
    expect(row.className).toMatch(/\bbg-loss\/10\b/);
  });

  it('CLOSED_WIN preserva el tinte de fondo bg-profit/10 en el <tr> (background + texto)', () => {
    renderRow({ ...baseTrade, id: 'win-bg', status: 'CLOSED_WIN' });
    const row = screen.getByTestId('trade-row-win-bg');
    expect(row.className).toMatch(/\bbg-profit\/10\b/);
  });

  it('CLOSED_LOSS mantiene el badge con label en español Perdida (a11y / color-blind)', () => {
    renderRow({ ...baseTrade, id: 'loss-badge', status: 'CLOSED_LOSS', pnl_usd: '-30.00' });
    const badge = screen.getByTestId('trade-status-CLOSED_LOSS');
    expect(badge).toHaveTextContent('Perdida');
  });

  it('CLOSED_WIN mantiene el badge con label en español Ganada (a11y / color-blind)', () => {
    renderRow({ ...baseTrade, id: 'win-badge', status: 'CLOSED_WIN' });
    const badge = screen.getByTestId('trade-status-CLOSED_WIN');
    expect(badge).toHaveTextContent('Ganada');
  });
});