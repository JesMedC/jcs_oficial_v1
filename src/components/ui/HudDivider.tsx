/*
 * jarvis-ui-redesign (T-09) — HudDivider primitive.
 *
 * The JARVIS HUD divider with optional centered label. Default
 * renders a single horizontal cyan rgba line. When `label` is set,
 * the line splits into two halves (flex-1 each) with a HUD-style
 * chip (display font, uppercase, tracking) sitting in the middle
 * gap — the "notch" effect from the reference.
 *
 * Used in the dashboard sidebar between sections (e.g. "HOY ·
 * Sesión en curso" / "MES · Agosto · en curso") and inside cards
 * between heading + content.
 *
 * Visual contract pinned by `HudDivider.test.tsx`.
 */
type HudDividerTone = 'subtle' | 'default' | 'strong';

interface HudDividerProps {
  readonly tone?: HudDividerTone;
  readonly label?: string;
  readonly className?: string;
}

const TONE_CLASSES: Record<HudDividerTone, string> = {
  subtle: 'bg-border',
  default: 'bg-[var(--jarvis-divider)]',
  strong: 'bg-[var(--jarvis-divider-strong)]',
};

export function HudDivider({
  tone = 'default',
  label,
  className = '',
}: HudDividerProps): JSX.Element {
  if (label) {
    return (
      <div
        role="separator"
        aria-orientation="horizontal"
        className={`flex items-center gap-3 w-full ${className}`}
      >
        <div
          data-jarvis-divider="line"
          className={`h-px flex-1 ${TONE_CLASSES[tone]}`}
        />
        <span
          data-jarvis-divider="chip"
          className="font-display uppercase tracking-wide text-[10px] text-text-secondary whitespace-nowrap"
        >
          {label}
        </span>
        <div
          data-jarvis-divider="line"
          className={`h-px flex-1 ${TONE_CLASSES[tone]}`}
        />
      </div>
    );
  }

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      data-jarvis-divider="line"
      className={`h-px w-full ${TONE_CLASSES[tone]} ${className}`}
    />
  );
}

export type { HudDividerProps, HudDividerTone };
