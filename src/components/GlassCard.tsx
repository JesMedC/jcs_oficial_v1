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

// Cyber-Jade spec (literal): glassmorphism universal — plano, sin tinte.
//   bg = rgba(13, 21, 30, 0.7)
//   backdrop-filter: blur(12px)
//   border: 1px solid rgba(0, 255, 157, 0.15)
// opacity-70: las cards viven en 70% para que el fondo animado (wall
// street board) se vea parcialmente a traves, manteniendo legibilidad
// por el border + blur + tipografia clara.
const BASE_GLASS =
  'relative bg-[var(--glass-surface)] backdrop-blur-[12px] border border-[var(--color-jade-border)] opacity-70';

const variantClasses: Record<GlassCardVariant, string> = {
  default: `${BASE_GLASS} rounded-xl p-6`,
  elevated: `${BASE_GLASS} rounded-xl p-6`,
  interactive: `${BASE_GLASS} rounded-xl p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-jade-border-line)] hover:shadow-[0_0_32px_rgba(0,255,157,0.15)]`, // design-system-v1 (Wave 3b, T3b.1) — neon-jade hover shadow at 0.15 alpha.
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
