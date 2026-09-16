/*
 * availableInstruments.test.ts — Contract for the instrument catalog
 * + the FOREX/BINARY market split.
 *
 * Pins the post-2026-09-15 revision where Commodities (gold, silver,
 * oil) are exposed under BOTH FOREX and BINARY markets — the user
 * can pick XAUUSD from the FOREX picker the same as EURUSD, which
 * mirrors how brokers like OANDA offer gold under forex-style
 * pricing. Crypto and Indices stay BINARY-only (no spot/cash market
 * on the FOREX side).
 */
import { describe, expect, it } from 'vitest';

import {
  AVAILABLE_BINARY_INSTRUMENTS,
  AVAILABLE_FOREX_INSTRUMENTS,
  INSTRUMENT_CATEGORY_LABEL,
  getAvailableInstruments,
} from '../availableInstruments';

describe('availableInstruments — Core Interface instrument catalog', () => {
  describe('AVAILABLE_FOREX_INSTRUMENTS', () => {
    it('includes the 7 majors (EURUSD, GBPUSD, AUDUSD, NZDUSD, USDJPY, USDCAD, USDCHF)', () => {
      const majors = ['EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD', 'USDJPY', 'USDCAD', 'USDCHF'];
      for (const m of majors) {
        expect(AVAILABLE_FOREX_INSTRUMENTS.some((i) => i.symbol === m)).toBe(true);
      }
    });

    it('includes the standard minor crosses (EUR/GBP/AUD crosses + their JPY/CHF pairs)', () => {
      const minors = [
        'EURJPY', 'EURGBP', 'EURCHF', 'EURAUD', 'EURNZD', 'EURCAD',
        'GBPJPY', 'GBPCHF', 'GBPCAD', 'GBPAUD', 'GBPNZD',
        'AUDJPY', 'AUDCHF', 'AUDNZD', 'AUDCAD',
        'NZDJPY', 'NZDCHF', 'NZDCAD',
        'CADJPY', 'CADCHF',
      ];
      for (const m of minors) {
        expect(AVAILABLE_FOREX_INSTRUMENTS.some((i) => i.symbol === m)).toBe(true);
      }
    });

    it('includes Commodities (gold, silver, oil) under FOREX-style pricing', () => {
      const commodities = ['XAUUSD', 'XAGUSD', 'OILUSD'];
      for (const c of commodities) {
        const found = AVAILABLE_FOREX_INSTRUMENTS.find((i) => i.symbol === c);
        expect(found).toBeDefined();
        expect(found?.category).toBe('Commodities');
        expect(found?.enabled).toBe(true);
      }
    });

    it('does NOT include Crypto (BTC/ETH/SOL/XRP) — those are BINARY-only', () => {
      const cryptoSymbols = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD'];
      for (const c of cryptoSymbols) {
        expect(AVAILABLE_FOREX_INSTRUMENTS.some((i) => i.symbol === c)).toBe(false);
      }
    });

    it('does NOT include Indices (SPX500/NAS100/DJI30) — those are BINARY-only', () => {
      const indices = ['SPX500', 'NAS100', 'DJI30'];
      for (const sym of indices) {
        expect(AVAILABLE_FOREX_INSTRUMENTS.some((i) => i.symbol === sym)).toBe(false);
      }
    });
  });

  describe('AVAILABLE_BINARY_INSTRUMENTS', () => {
    it('is the full catalog (all categories)', () => {
      const forexOnly = AVAILABLE_FOREX_INSTRUMENTS.length;
      const bin = AVAILABLE_BINARY_INSTRUMENTS.length;
      expect(bin).toBeGreaterThan(forexOnly);
    });

    it('includes gold, silver, oil', () => {
      for (const c of ['XAUUSD', 'XAGUSD', 'OILUSD']) {
        expect(AVAILABLE_BINARY_INSTRUMENTS.some((i) => i.symbol === c)).toBe(true);
      }
    });

    it('includes crypto and indices', () => {
      for (const s of ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'SPX500', 'NAS100', 'DJI30']) {
        expect(AVAILABLE_BINARY_INSTRUMENTS.some((i) => i.symbol === s)).toBe(true);
      }
    });
  });

  describe('getAvailableInstruments(kind)', () => {
    it('FOREX returns the FOREX list filtered to enabled=true', () => {
      const forex = getAvailableInstruments('FOREX');
      expect(forex.length).toBe(AVAILABLE_FOREX_INSTRUMENTS.length);
      expect(forex.every((i) => i.enabled)).toBe(true);
      expect(forex.some((i) => i.symbol === 'XAUUSD')).toBe(true);
    });

    it('BINARY returns the BINARY list filtered to enabled=true', () => {
      const bin = getAvailableInstruments('BINARY');
      expect(bin.length).toBe(AVAILABLE_BINARY_INSTRUMENTS.length);
      expect(bin.every((i) => i.enabled)).toBe(true);
      expect(bin.some((i) => i.symbol === 'XAUUSD')).toBe(true);
    });
  });

  describe('INSTRUMENT_CATEGORY_LABEL', () => {
    it('has a Spanish label for every category', () => {
      const categories = ['Major', 'Minor', 'Exotic', 'Crypto', 'Commodities', 'Indices'] as const;
      for (const c of categories) {
        expect(INSTRUMENT_CATEGORY_LABEL[c]).toBeTruthy();
        expect(typeof INSTRUMENT_CATEGORY_LABEL[c]).toBe('string');
      }
    });

    it('labels Commodities as "Materias primas"', () => {
      expect(INSTRUMENT_CATEGORY_LABEL.Commodities).toBe('Materias primas');
    });
  });
});
