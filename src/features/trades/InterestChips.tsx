/*
 * one-by-one-thousand-discipline (PR-2) — InterestChips.
 *
 * Single-select chip selector for the trade ``interest`` field
 * (REQ-INT-002/003). Mirrors the multi-select EmotionalTagsChips
 * pattern from this same feature folder so the chip visual language
 * stays consistent — same `data-active` testid shape, same source-of-
 * truth rule (parent owns ``value``, component emits via ``onChange``).
 *
 * Why single-select: ``interest`` is one of {FOMO, PLAN, REVENGE,
 * IMPULSE} and the backend requires exactly one value (the
 * ``Literal["FOMO","PLAN","REVENGE","IMPULSE"]`` on
 * ``TradeCreateIn.interest`` — see backend
 * ``app/schemas/trade.py`` line 129, PR-1).
 *
 * Co-existence with ``emotional_tags`` (decision #2 from #178): this
 * is a separate dimension — emotional_tags powers the DisciplineScore
 * (multi), interest is required on every new trade (single).
 *
 * Cyber-Jade tokens only. ``data-active`` exposes the active state to
 * tests + CSS so the visual contract is observable without depending
 * on the Tailwind class string (which is brittle to rename).
 */
import { INTEREST_LABEL, type Interest } from './types';

interface Props {
  /** Currently selected interest (one of the four literals). */
  readonly value: Interest | null;
  /** Called with the next selected key (or ``null`` if cleared). */
  readonly onChange: (next: Interest | null) => void;
}

export function InterestChips({ value, onChange }: Props) {
  const select = (key: Interest) => {
    // Clicking the already-active chip clears the selection — keeps
    // the control reversible from a single interaction without a
    // dedicated "Clear" button (the chip IS the control).
    onChange(value === key ? null : key);
  };

  return (
    <div data-testid="interest-chips" className="flex flex-wrap gap-2">
      {(Object.keys(INTEREST_LABEL) as Interest[]).map((key) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            data-testid={`interest-${key}`}
            data-active={active}
            onClick={() => select(key)}
            className={`px-3 py-1 rounded-full border text-xs uppercase tracking-wide font-display transition-colors ${
              active
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-primary/20 text-text-secondary hover:border-primary/40'
            }`}
          >
            {INTEREST_LABEL[key]}
          </button>
        );
      })}
    </div>
  );
}