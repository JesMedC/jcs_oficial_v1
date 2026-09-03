import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

type GlassCardVariant = 'default' | 'elevated' | 'interactive';

interface GlassCardOwnProps {
  readonly variant?: GlassCardVariant;
  readonly className?: string;
  readonly children: ReactNode;
}

type GlassCardProps<E extends ElementType> = GlassCardOwnProps & {
  readonly as?: E;
} & Omit<ComponentPropsWithoutRef<E>, keyof GlassCardOwnProps | 'as'>;

const variantClasses: Record<GlassCardVariant, string> = {
  default: 'bg-surface-el/30 backdrop-blur-md border border-primary/20 rounded-2xl p-6',
  elevated:
    'bg-surface-el/50 backdrop-blur-md border border-primary/20 rounded-2xl p-6 shadow-[0_12px_48px_rgba(8,13,18,0.6)]',
  interactive:
    'bg-surface-el/30 backdrop-blur-md border border-primary/20 rounded-2xl p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-[0_0_32px_rgba(0,255,157,0.15)]', // design-system-v1 (Wave 3b, T3b.1) — cyan rgba swapped for neon jade rgba(0,255,157,*).
};

export function GlassCard<E extends ElementType = 'div'>(props: GlassCardProps<E>) {
  const {
    as,
    variant = 'default',
    className = '',
    children,
    ...rest
  } = props as GlassCardProps<ElementType>;
  const Component = (as ?? 'div') as ElementType;
  const classes = [variantClasses[variant], className].filter(Boolean).join(' ');
  return (
    <Component className={classes} {...rest}>
      {children}
    </Component>
  );
}
