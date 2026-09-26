import { Link } from 'react-router-dom';
import { SurfacePanel } from '../ui/SurfacePanel';

export interface AuthValuePanelProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly panelTitle: string;
  readonly benefits: ReadonlyArray<string>;
  readonly footerText: string;
  readonly footerLinkLabel: string;
  readonly footerTo: string;
}

export function AuthValuePanel({
  eyebrow,
  title,
  description,
  panelTitle,
  benefits,
  footerText,
  footerLinkLabel,
  footerTo,
}: AuthValuePanelProps): JSX.Element {
  return (
    <div className="motion-reveal">
      <span className="inline-flex rounded-full border border-[var(--color-brand-primary)]/40 px-3 py-1 text-xs font-display uppercase tracking-wide text-[var(--color-brand-primary)]">
        {eyebrow}
      </span>
      <h1 className="mt-4 font-display text-3xl uppercase leading-tight tracking-wide text-[var(--color-text-primary)] md:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-[var(--color-text-secondary)]">
        {description}
      </p>
      <SurfacePanel variant="default" padding="md" className="mt-8 max-w-md">
        <h2 className="font-display text-sm uppercase tracking-wide text-[var(--color-text-primary)] md:text-base">
          {panelTitle}
        </h2>
        <ul className="mt-3 space-y-3 text-sm text-[var(--color-text-secondary)]">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex gap-2">
              <span aria-hidden="true" className="mt-1 text-[var(--color-state-positive)]">●</span>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      </SurfacePanel>
      <p className="mt-6 text-xs text-[var(--color-text-muted)]">
        {footerText}{' '}
        <Link to={footerTo} className="text-[var(--color-brand-primary)] hover:underline">
          {footerLinkLabel}
        </Link>
      </p>
    </div>
  );
}
