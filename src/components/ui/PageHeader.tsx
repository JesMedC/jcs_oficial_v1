/*
 * jarvis-ui-redesign (T-15 polish) — PageHeader primitive.
 *
 * The hero block at the top of every portal page. Mirrors the
 * dashboard's "MAIN PANEL" / "HOLA, JESUS" pattern:
 *
 *   ‹SUB-LABEL›             ‹OPTIONAL ACTIONS ON THE RIGHT›
 *   ‹H1 TITLE›
 *   ‹Subtitle copy›
 *
 * - Sub-label is a small uppercase tracking-[0.4em] cyan block.
 * - H1 takes the page title and applies a calibrated cyan glow
 *   from --jarvis-h1-glow.
 * - Subtitle is a regular secondary-tone paragraph capped at the
 *   2xl max-width so very long copies wrap inside the layout.
 * - The actions slot is a right-aligned flex row for CTA buttons.
 */
import type { ReactNode } from 'react';

interface PageHeaderProps {
  readonly subLabel?: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly actions?: ReactNode;
  readonly className?: string;
  readonly titleTestId?: string;
}

export function PageHeader({
  subLabel,
  title,
  subtitle,
  actions,
  className = '',
  titleTestId,
}: PageHeaderProps) {
  return (
    <div
      className={`flex items-start justify-between gap-4 flex-wrap py-4 ${className}`}
    >
      <div className="min-w-0 flex-1">
        {subLabel ? (
          <span className="font-display uppercase tracking-[0.4em] text-[10px] md:text-xs text-primary">
            {subLabel}
          </span>
        ) : null}
        <h1
          data-testid={titleTestId}
          className="font-display uppercase tracking-wide text-3xl md:text-4xl lg:text-5xl mt-1 text-text-primary"
          style={{ textShadow: '0 0 18px var(--jarvis-h1-glow)' }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="text-text-secondary font-body text-sm md:text-base mt-2 max-w-2xl">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex items-center gap-3 flex-wrap">{actions}</div>
      ) : null}
    </div>
  );
}
