/*
 * portal-fase0a-base — GlassDrawer.
 *
 * Anchor-style side panel primitive. Slides in from the chosen side
 * (right by default — `+ Nuevo Trade`, settings, etc.) or from the
 * left (notifications, mobile sheets). Mirrors the spec at
 * openspec/changes/portal-fase0a-base/specs/glass-drawer.
 *
 * Differences from GlassModal:
 *   - Anchor-based (anchored to viewport edge), not centered.
 *   - CSS-only slide animation via translate-x-full/-translate-x-full
 *     ↔ translate-x-0 with transition-transform duration-200 ease-out.
 *   - Optional `closeOnBackdropClick` / `closeOnEscape` flags so a
 *     settings drawer that demands confirmation can disable both.
 *   - focus-trap: Tab and Shift+Tab cycle within the panel.
 *   - focus restoration: on close, focus returns to the element that
 *     had focus before `open` flipped to true.
 *
 * Project ships zero animation deps; framer-motion would add ~30KB
 * and the same look is achievable in pure CSS.
 */
import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react';

import type { GlassVariant } from './GlassPanel';

export type GlassDrawerSide = 'right' | 'left';
export type GlassDrawerMaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export interface GlassDrawerProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly side?: GlassDrawerSide;
  readonly maxWidth?: GlassDrawerMaxWidth;
  readonly variant?: GlassVariant;
  readonly closeOnBackdropClick?: boolean;
  readonly closeOnEscape?: boolean;
  readonly title?: ReactNode;
  readonly footer?: ReactNode;
  readonly panelClassName?: string;
  readonly children: ReactNode;
  readonly ariaLabel?: string;
}

const MAX_WIDTH_CLASS: Record<GlassDrawerMaxWidth, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-full',
};

const VARIANT_BG: Record<GlassVariant, string> = {
  subtle: 'bg-glass-subtle',
  default: 'bg-glass',
  strong: 'bg-glass-strong',
};

const VARIANT_BORDER: Record<GlassVariant, string> = {
  subtle: 'border-glass-border-subtle',
  default: 'border-glass-border',
  strong: 'border-glass-border-strong',
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * GlassDrawer — anchor-style translucent side panel.
 *
 * Mounted once near the application root (TopNav hosts the
 * NewTradeDrawer portal-level) so it's available on every page that
 * needs it without prop drilling.
 */
export function GlassDrawer({
  open,
  onClose,
  side = 'right',
  maxWidth = 'md',
  variant = 'default',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  title,
  footer,
  panelClassName,
  children,
  ariaLabel,
}: GlassDrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Capture the invoker so we can restore focus on close.
  useEffect(() => {
    if (open) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    }
  }, [open]);

  // Restore focus on close.
  useEffect(() => {
    if (!open) {
      const target = previouslyFocusedRef.current;
      if (target !== null && typeof target.focus === 'function') {
        // Defer to the next frame so screen readers re-announce the
        // page after the drawer unmounts.
        const id = window.setTimeout(() => {
          target.focus();
        }, 0);
        return () => {
          window.clearTimeout(id);
        };
      }
    }
    return undefined;
  }, [open]);

  // Escape to close + focus trap.
  useEffect(() => {
    if (!open) return undefined;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscape) {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key === 'Tab') {
        const panel = panelRef.current;
        if (panel === null) return;
        const focusables = Array.from(
          panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
        if (focusables.length === 0) {
          event.preventDefault();
          panel.focus();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (event.shiftKey) {
          if (active === first || !panel.contains(active)) {
            event.preventDefault();
            last?.focus();
          }
        } else {
          if (active === last || !panel.contains(active)) {
            event.preventDefault();
            first?.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [open, closeOnEscape, onClose]);

  // Move focus to the panel right after it mounts so keyboard users
  // land inside the drawer, not stuck on the (still-focused) trigger.
  useEffect(() => {
    if (open) {
      const id = window.requestAnimationFrame(() => {
        panelRef.current?.focus();
      });
      return () => {
        window.cancelAnimationFrame(id);
      };
    }
    return undefined;
  }, [open]);

  const handleBackdropClick = useCallback(() => {
    if (closeOnBackdropClick) onClose();
  }, [closeOnBackdropClick, onClose]);

  if (!open) return null;

  const sideClasses =
    side === 'right'
      ? 'right-0 translate-x-0'
      : 'left-0 translate-x-0';

  const panelClasses = [
    'fixed top-0 bottom-0',
    sideClasses,
    'w-full',
    MAX_WIDTH_CLASS[maxWidth],
    VARIANT_BG[variant],
    'backdrop-blur-glass-lg',
    'border',
    VARIANT_BORDER[variant],
    side === 'right' ? 'border-l' : 'border-r',
    'rounded-none',
    'shadow-elevated',
    'flex flex-col',
    'outline-none',
    panelClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      data-testid="glass-drawer-root"
      className="fixed inset-0 z-40 bg-black/60"
      onClick={handleBackdropClick}
      aria-hidden="true"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title !== undefined ? titleId : undefined}
        aria-label={ariaLabel ?? (typeof title === 'string' ? title : undefined)}
        tabIndex={-1}
        data-testid="glass-drawer-panel"
        data-side={side}
        data-max-width={maxWidth}
        data-variant={variant}
        className={panelClasses}
        onClick={(event) => {
          // Stop the click from bubbling up to the backdrop handler.
          event.stopPropagation();
        }}
      >
        {title !== undefined ? (
          <div className="flex items-center justify-between px-5 py-4 border-b border-glass-border">
            <h2
              id={titleId}
              className="font-display uppercase tracking-wide text-primary text-base md:text-lg truncate"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="text-text-muted hover:text-text-primary text-lg leading-none"
            >
              ×
            </button>
          </div>
        ) : null}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer !== undefined ? (
          <div className="px-5 py-4 border-t border-glass-border flex justify-end gap-2">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
