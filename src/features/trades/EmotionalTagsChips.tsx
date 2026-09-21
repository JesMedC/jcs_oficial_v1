/*
 * FASE 4A / Ola 6 — EmotionalTagsChips.
 *
 * Multi-select pill selector for the EmotionalTag enum defined in
 * `./types`. Backed by `EMOTIONAL_TAG_LABEL` (the canonical Spanish
 * label map) so adding a new tag to the enum + label map automatically
 * surfaces a new chip here — no UI change needed.
 *
 * Visual model: a tag toggles in/out of the parent's array. The active
 * state is sourced from the parent (`value.includes(key)`) so the
 * component stays pure and easy to test — every interaction flows
 * through `onChange` and the parent decides what to do.
 *
 * ``data-active`` is exposed on each button so tests + CSS hooks can
 * target the active state without depending on the Tailwind class
 * string (which is more brittle to rename).
 */
import { EMOTIONAL_TAG_LABEL, type EmotionalTag } from './types';

interface Props {
  readonly value: readonly EmotionalTag[];
  readonly onChange: (next: EmotionalTag[]) => void;
}

export function EmotionalTagsChips({ value, onChange }: Props) {
  const toggle = (key: EmotionalTag) => {
    if (value.includes(key)) {
      onChange(value.filter((k) => k !== key));
    } else {
      onChange([...value, key]);
    }
  };

  return (
    <div data-testid="emotional-tags-chips" className="flex flex-wrap gap-2">
      {(Object.keys(EMOTIONAL_TAG_LABEL) as EmotionalTag[]).map((key) => {
        const active = value.includes(key);
        return (
          <button
            key={key}
            type="button"
            data-testid={`emotional-tag-${key}`}
            data-active={active}
            onClick={() => toggle(key)}
            className={`px-3 py-1 rounded-full border text-xs uppercase tracking-wide font-display transition-colors ${
              active
                ? 'border-warning bg-warning/15 text-warning'
                : 'border-primary/20 text-text-secondary hover:border-primary/40'
            }`}
          >
            {EMOTIONAL_TAG_LABEL[key]}
          </button>
        );
      })}
    </div>
  );
}
