/*
 * InstrumentPicker.test.tsx — RED contract for the missing
 * ``./InstrumentPicker`` component used by ``NewTradeForm``.
 *
 * Background: commit 8474ec9 (DVC-02) added the import on
 * ``NewTradeForm.tsx`` but never created the module — same bug
 * pattern as the missing ``localBucketForTimestamp``. The picker
 * groups instruments by ``INSTRUMENT_CATEGORY_LABEL`` (Mayores /
 * Cruzados / Exoticos / Criptomonedas / Materias primas / Indices)
 * so the user can find EURUSD faster than scanning a flat list.
 *
 * The picker is a controlled component — it owns NO state, it just
 * forwards ``value`` + ``onChange`` to the parent ``Controller``.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  AVAILABLE_FOREX_INSTRUMENTS,
  INSTRUMENT_CATEGORY_LABEL,
  type InstrumentInfo,
} from '../availableInstruments';
import { InstrumentPicker } from '../InstrumentPicker';

function renderPicker(
  overrides: Partial<React.ComponentProps<typeof InstrumentPicker>> = {},
) {
  const onChange = vi.fn();
  const onBlur = vi.fn();
  const utils = render(
    <InstrumentPicker
      value="EURUSD"
      onChange={onChange}
      onBlur={onBlur}
      instruments={AVAILABLE_FOREX_INSTRUMENTS}
      label="Par (FOREX)"
      invalid={false}
      {...overrides}
    />,
  );
  return { onChange, onBlur, ...utils };
}

describe('InstrumentPicker', () => {
  it('renderiza un <select> accesible con el label que recibe', () => {
    renderPicker();
    const select = screen.getByRole('combobox', { name: /Par \(FOREX\)/i });
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe('SELECT');
  });

  it('preselecciona el value que recibe (controlled)', () => {
    renderPicker({ value: 'GBPUSD' });
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('GBPUSD');
  });

  it('emite onChange con el symbol cuando el usuario elige otro instrumento', () => {
    const { onChange } = renderPicker({ value: 'EURUSD' });
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'GBPUSD' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('GBPUSD');
  });

  it('emite onBlur cuando el select pierde foco', () => {
    const { onBlur } = renderPicker();
    const select = screen.getByRole('combobox');
    fireEvent.blur(select);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('agrupa los instrumentos por categoría con <optgroup> y label en español', () => {
    renderPicker();
    // The picker must include at least one <optgroup> per category
    // present in the FOREX list — pins the group-by-category UX so
    // users can scan Mayores without seeing Criptomonedas.
    const groups = screen.getAllByRole('group');
    const labels = groups.map((g) => g.getAttribute('label') ?? '');
    // FOREX list excludes Crypto + Indices, so we should see at
    // least the four remaining categories.
    expect(labels).toContain(INSTRUMENT_CATEGORY_LABEL.Major);
    expect(labels).toContain(INSTRUMENT_CATEGORY_LABEL.Minor);
    expect(labels).toContain(INSTRUMENT_CATEGORY_LABEL.Exotic);
    expect(labels).toContain(INSTRUMENT_CATEGORY_LABEL.Commodities);
  });

  it('ofrece una <option> por cada InstrumentInfo recibido', () => {
    renderPicker();
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    const optionSymbols = Array.from(select.options).map((o) => o.value);
    for (const inst of AVAILABLE_FOREX_INSTRUMENTS) {
      expect(optionSymbols).toContain(inst.symbol);
    }
  });

  it('marca aria-invalid cuando invalid=true (el padre lo pasa)', () => {
    renderPicker({ invalid: true });
    const select = screen.getByRole('combobox');
    expect(select.getAttribute('aria-invalid')).toBe('true');
  });

  it('no marca aria-invalid cuando invalid=false', () => {
    renderPicker({ invalid: false });
    const select = screen.getByRole('combobox');
    // jsdom renders aria-invalid="false" when explicitly set; React
    // only omits the attribute when undefined. The picker MUST set
    // it explicitly so screen readers + tests see a stable state.
    expect(select.getAttribute('aria-invalid')).toBe('false');
  });

  it('acepta una lista custom de instrumentos (no se cuelga del módulo)', () => {
    const custom: ReadonlyArray<InstrumentInfo> = [
      { symbol: 'EURUSD', name: 'Euro / Dolar', category: 'Major', enabled: true },
      { symbol: 'BTCUSD', name: 'Bitcoin / Dolar', category: 'Crypto', enabled: true },
    ];
    renderPicker({ instruments: custom });
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    const optionSymbols = Array.from(select.options).map((o) => o.value);
    expect(optionSymbols).toEqual(['EURUSD', 'BTCUSD']);
    // BOTH categories should appear in the optgroups even though
    // we passed only one Major + one Crypto.
    const groupLabels = screen
      .getAllByRole('group')
      .map((g) => g.getAttribute('label') ?? '');
    expect(groupLabels).toContain(INSTRUMENT_CATEGORY_LABEL.Major);
    expect(groupLabels).toContain(INSTRUMENT_CATEGORY_LABEL.Crypto);
  });
});