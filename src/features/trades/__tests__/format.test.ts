/*
 * FASE 4A — format helpers unit tests.
 *
 * Locks the four contracts the dense TradeTable depends on:
 *   - formatMoney: signed +/- prefix + es-AR comma decimal.
 *   - formatPct: ratios in [0,1] render with one or two fraction digits.
 *   - formatNumber: string-numeric Decimal payloads format like numbers.
 *   - pnlColor: positive → text-profit, negative → text-loss, null → muted.
 */
import { describe, expect, it } from 'vitest';

import { formatMoney, formatNumber, formatPct, pnlColor } from '../format';

describe('formatMoney', () => {
  it('formatea positivo con signo +', () => {
    expect(formatMoney(100)).toMatch(/^\+/);
    expect(formatMoney(100)).toContain('100');
  });

  it('formatea negativo con signo -', () => {
    expect(formatMoney(-50)).toMatch(/^-/);
  });

  it('cero no lleva signo', () => {
    expect(formatMoney(0)).not.toMatch(/^[+-]/);
  });

  it('devuelve — para null/undefined/NaN', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(undefined)).toBe('—');
    expect(formatMoney('not-a-number')).toBe('—');
  });

  it('acepta string numérico (Decimal serializado)', () => {
    // es-AR uses comma as decimal separator.
    expect(formatMoney('123.45')).toContain('123,45');
  });

  it('opts.signed === false omite el prefijo +/-', () => {
    expect(formatMoney(100, { signed: false })).not.toMatch(/^[+-]/);
    expect(formatMoney(100, { signed: false })).toContain('100');
  });
});

describe('pnlColor', () => {
  it('positivo → profit', () => {
    expect(pnlColor(10)).toBe('text-profit');
  });

  it('negativo → loss', () => {
    expect(pnlColor(-10)).toBe('text-loss');
  });

  it('cero, null o undefined → secondary', () => {
    expect(pnlColor(0)).toBe('text-text-secondary');
    expect(pnlColor(null)).toBe('text-text-secondary');
    expect(pnlColor(undefined)).toBe('text-text-secondary');
  });

  it('string numérico positivo → profit', () => {
    expect(pnlColor('12.5')).toBe('text-profit');
  });
});

describe('formatPct', () => {
  it('0.5 → 50,0%', () => {
    expect(formatPct(0.5)).toContain('50');
  });

  it('null / undefined → —', () => {
    expect(formatPct(null)).toBe('—');
    expect(formatPct(undefined)).toBe('—');
  });
});

describe('formatNumber', () => {
  it('1.234567 → 1,23 (comma decimal)', () => {
    expect(formatNumber(1.234567)).toContain('1,23');
  });

  it('null / undefined → —', () => {
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber(undefined)).toBe('—');
  });
});
