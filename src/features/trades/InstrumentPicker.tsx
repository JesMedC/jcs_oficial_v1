/*
 * InstrumentPicker — Controlled <select> for the pair / instrument
 * the user wants to trade. Used by ``NewTradeForm`` for both FOREX
 * and BINARY markets (the only difference is the ``instruments``
 * list passed in).
 *
 * Groups instruments by ``INSTRUMENT_CATEGORY_LABEL`` (Mayores /
 * Cruzados / Exoticos / Criptomonedas / Materias primas / Indices)
 * so the user can scan EURUSD inside the "Mayores" group instead
 * of paging through 40+ symbols flat. The group order follows the
 * natural reading order: Major → Minor → Exotic → Commodities →
 * Crypto → Indices.
 *
 * Pure controlled component — owns no state. The parent wires
 * ``value`` / ``onChange`` / ``onBlur`` through RHF's
 * ``Controller``. ``aria-invalid`` mirrors the parent's ``invalid``
 * prop so screen readers + tests see a stable boolean.
 */
import { useMemo } from 'react';

import {
  INSTRUMENT_CATEGORY_LABEL,
  type InstrumentCategory,
  type InstrumentInfo,
} from './availableInstruments';

export interface InstrumentPickerProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onBlur: () => void;
  readonly instruments: ReadonlyArray<InstrumentInfo>;
  readonly label: string;
  readonly invalid: boolean;
}

const CATEGORY_ORDER: ReadonlyArray<InstrumentCategory> = [
  'Major',
  'Minor',
  'Exotic',
  'Commodities',
  'Crypto',
  'Indices',
];

export function InstrumentPicker({
  value,
  onChange,
  onBlur,
  instruments,
  label,
  invalid,
}: InstrumentPickerProps) {
  // Build the grouped list once per ``instruments`` ref change —
  // useMemo keeps the array identity stable across renders so the
  // underlying <select> doesn't churn options on every keystroke.
  const grouped = useMemo(() => {
    const byCategory = new Map<InstrumentCategory, InstrumentInfo[]>();
    for (const inst of instruments) {
      const bucket = byCategory.get(inst.category) ?? [];
      bucket.push(inst);
      byCategory.set(inst.category, bucket);
    }
    return CATEGORY_ORDER
      .filter((cat) => (byCategory.get(cat)?.length ?? 0) > 0)
      .map((cat) => ({ category: cat, items: byCategory.get(cat) ?? [] }));
  }, [instruments]);

  return (
    <select
      aria-label={label}
      aria-invalid={invalid ? 'true' : 'false'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      data-testid="instrument-picker"
      className="w-full px-3 py-2 bg-surface-el/50 border border-primary/30 rounded-lg text-text-primary font-body text-sm focus:outline-none focus:ring-1 focus:ring-primary"
    >
      {grouped.map(({ category, items }) => (
        <optgroup key={category} label={INSTRUMENT_CATEGORY_LABEL[category]}>
          {items.map((inst) => (
            <option key={inst.symbol} value={inst.symbol}>
              {inst.symbol} — {inst.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}