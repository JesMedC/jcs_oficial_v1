import { describe, expect, it } from 'vitest';
import { formatHour } from '../formatHour';

describe('formatHour (T-047 helper)', () => {
  it('retorna el patron HH:MM hrs para un ISO con Z suffix', () => {
    // Use a fixed UTC instant; the local clock may shift the
    // display but the helper MUST always emit two-digit hours +
    // minutes + the literal ` hrs` suffix.
    const out = formatHour('2026-09-15T14:32:00Z');
    expect(out).toMatch(/^\d{2}:\d{2} hrs$/);
  });

  it('lanza DateTimeFormat con dos digitos padded (sin single-digit hours)', () => {
    const out = formatHour('2026-01-01T03:05:00Z');
    expect(out).toMatch(/^\d{2}:\d{2} hrs$/);
  });
});
