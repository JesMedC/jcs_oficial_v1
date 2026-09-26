import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

export type SurfacePanelVariant = 'default' | 'elevated' | 'outline';
export type SurfacePanelPadding = 'none' | 'sm' | 'md' | 'lg';

interface SurfacePanelOwnProps {
  readonly variant?: SurfacePanelVariant;
  readonly padding?: SurfacePanelPadding;
  readonly interactive?: boolean;
  readonly children: ReactNode;
  readonly className?: string;
}

export type SurfacePanelProps<E extends ElementType = 'section'> =
  SurfacePanelOwnProps & {
    readonly as?: E;
  } & Omit<ComponentPropsWithoutRef<E>, keyof SurfacePanelOwnProps | 'as'>;

const VARIANTS: Record<SurfacePanelVariant, string> = {
  default: 'bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)]',
  elevated: 'bg-[var(--color-bg-elevated)] border-[var(--color-border-strong)] shadow-[var(--shadow-glass-panel)]',
  outline: 'bg-transparent border-[var(--color-border-subtle)]',
};

const PADDING: Record<SurfacePanelPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function SurfacePanel<E extends ElementType = 'section'>(
  props: SurfacePanelProps<E>,
): JSX.Element {
  const {
    as,
    variant = 'default',
    padding = 'md',
    interactive = false,
    className = '',
    children,
    ...rest
  } = props as SurfacePanelProps<ElementType>;
  const Component = (as ?? 'section') as ElementType;
  const classes = [
    'rounded-xl border backdrop-blur-md',
    VARIANTS[variant],
    PADDING[padding],
    interactive ? 'motion-surface cursor-pointer' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={classes} {...rest}>
      {children}
    </Component>
  );
}
