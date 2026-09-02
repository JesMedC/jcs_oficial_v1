/*
 * FASE 4A / Ola 6 — DisciplineSoftBlock.
 *
 * Soft (not hard) amber banner that surfaces when the user attempts to
 * open a trade with an empty journal (no pre_trade_notes AND no
 * emotional tags). The banner is informational + reversible: the user
 * can either dismiss it back to the form (focus the notes textarea)
 * or skip it and submit anyway. A hard block is deliberately not used
 * here — discipline tracking should be a guard rail, not a wall.
 *
 * Visibility contract:
 *   - Hidden when `preTradeNotes` is non-empty OR `emotionalTagsCount > 0`.
 *   - Hidden after the user acknowledges with "Guardar igual".
 *
 * ``acknowledged`` resets when the journal flips back to non-empty, so
 * a partially-filled submit attempt followed by clearing the form
 * re-surfaces the warning on the next attempt.
 */
import { useEffect, useState } from 'react';

interface Props {
  readonly preTradeNotes: string;
  readonly emotionalTagsCount: number;
  /** Called when the user clicks "Guardar igual" (skip). */
  readonly onConfirmSkip: () => void;
  /** Called when the user clicks "Agregar nota" — should focus the notes field. */
  readonly onRequestFocusNotes: () => void;
}

export function DisciplineSoftBlock({
  preTradeNotes,
  emotionalTagsCount,
  onConfirmSkip,
  onRequestFocusNotes,
}: Props) {
  const [acknowledged, setAcknowledged] = useState(false);

  const isEmpty = preTradeNotes.trim() === '' && emotionalTagsCount === 0;

  // When the journal flips back to non-empty, drop the local ack so a
  // future empty submit attempt can re-surface the warning.
  useEffect(() => {
    if (!isEmpty) setAcknowledged(false);
  }, [isEmpty]);

  if (!isEmpty || acknowledged) return null;

  return (
    <div
      data-testid="discipline-soft-block"
      role="alert"
      className="rounded-lg border border-warning/40 bg-warning/10 p-3 flex flex-col gap-2"
    >
      <div className="flex items-start gap-2">
        <span className="text-warning text-lg" aria-hidden="true">⚠</span>
        <div className="flex-1">
          <p className="text-sm text-text-primary">
            Vas a guardar este trade <strong>sin journal</strong> (notas y/o etiquetas emocionales vacías).
            Esto puede afectar tu <em>win-rate tracking</em> y el cálculo de disciplina.
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          data-testid="soft-block-add-notes"
          onClick={onRequestFocusNotes}
          className="px-3 py-1 rounded border border-primary/30 text-text-secondary hover:border-primary/60 text-sm"
        >
          Agregar nota
        </button>
        <button
          type="button"
          data-testid="soft-block-skip"
          onClick={onConfirmSkip}
          className="px-3 py-1 rounded bg-warning/20 text-warning border border-warning/40 text-sm font-display uppercase tracking-wide"
        >
          Guardar igual
        </button>
      </div>
    </div>
  );
}
