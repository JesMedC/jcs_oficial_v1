import type { ReactNode } from 'react';
import { SurfacePanel, type SurfacePanelVariant } from './SurfacePanel';

export type MetricCardTone = 'default' | 'positive' | 'risk' | 'warning';

export interface MetricCardProps {
  readonly label: string;
  readonly value: string;
  readonly detail?: string;
  readonly trend?: string;
  readonly icon?: ReactNode;
  readonly tone?: MetricCardTone;
  readonly variant?: SurfacePanelVariant;
  readonly className?: string;
}

const TONE_CLASSES: Record<MetricCardTone, string> = {
  default: 'text-[var(--color-text-primary)]',
  positive: 'text-[var(--color-state-positive)]',
  risk: 'text-[var(--color-state-risk)]',
  warning: 'text-[var(--color-state-warning)]',
};

export function MetricCard({
  label,
  value,
  detail,
  trend,
  icon,
  tone = 'default',
  variant = 'default',
  className = '',
}: MetricCardProps): JSX.Element {
  return (
    <SurfacePanel
      variant={variant}
      padding="md"
      className={`flex min-h-28 flex-col justify-between ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[10px] font-display uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          {label}
        </span>
        {icon ? <span aria-hidden="true" className="text-[var(--color-brand-primary)]">{icon}</span> : null}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <strong className={`font-mono text-xl tabular-nums ${TONE_CLASSES[tone]}`}>
          {value}
        </strong>
        {trend ? <span className={`text-xs ${TONE_CLASSES[tone]}`}>{trend}</span> : null}
      </div>
      {detail ? <span className="mt-1 text-xs text-[var(--color-text-secondary)]">{detail}</span> : null}
    </SurfacePanel>
  );
}
