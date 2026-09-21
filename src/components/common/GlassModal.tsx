/*
 * p0ui.1 — GlassModal.
 * portal-fase0a-base — comments aligned with jade primary pivot.
 *
 * Lightweight glass wrapper over the existing <Modal> (Modal.tsx,
 * p0e.3). GlassModal does NOT replace Modal — it composes it so all
 * existing escape/backdrop/focus behavior stays intact and the
 * 25+ existing callers keep working unchanged.
 *
 * dvc-01 — `variant` prop splits the inner surface treatment so the
 * close-trade flow no longer wraps the form body in a translucent
 * white panel. The Modal portal already lands at body root and
 * paints an opaque dark surface; layering another translucent
 * white panel on top was making the form look ghostly against the
 * dashboard cards (the original screenshot symptom). The opaque
 * variant keeps the close-trade dialog on-brand with the cyan-on-
 * dark identity the rest of the dashboard speaks.
 *
 *   - ``variant="glass"`` (default, preserved for showcase):
 *     wraps children in a translucent white panel with backdrop-blur,
 *     glass border + shadow. This is the surface the GlassShowcase
 *     styleguide previews against a coloured backdrop so the
 *     translucency reads.
 *   - ``variant="solid"`` (CloseTradeModal and any future dialog
 *     that mounts from inside a backdrop-filter ancestor): drops the
 *     translucent inner panel and lets the Modal's opaque dark
 *     surface show through. The cyan stroke on the Modal border
 *     remains.
 *
 * ``panelClassName`` lets callers extend the inner surface (e.g. for
 * custom padding or extra utility classes). It is concatenated AFTER
 * the base glass classes so callers cannot strip them — but for
 * ``variant="solid"`` the base glass classes are not emitted so the
 * caller's overrides land on the opaque Modal surface.
 */
import { type ReactNode } from 'react';

import { Modal } from '../portal/Modal';

interface GlassModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  /** Extra classes appended to the inner surface. */
  readonly panelClassName?: string;
  /**
   * Surface treatment for the inner panel.
   *   - ``glass`` (default): translucent white with backdrop blur —
   *     the showcase surface. The Modal underneath still paints its
   *     opaque dark surface, so the inner panel reads as a layered
   *     glass card on a dark frame.
   *   - ``solid``: skip the translucent inner panel. The Modal's
   *     opaque dark surface + cyan stroke carries the panel; this is
   *     the variant for dialogs that live inside dashboard cards
   *     (e.g. CloseTradeModal mounted from a backdrop-blur feed
   *     card) so the form does not look ghostly against its caller.
   */
  readonly variant?: 'glass' | 'solid';
}

const PANEL_BASE_CLASSES = [
  'bg-glass-strong',
  'backdrop-blur-glass-lg',
  'border',
  'border-glass-border-strong',
  'rounded-glass-lg',
  'shadow-glass-panel',
  'p-5',
].join(' ');

export function GlassModal({
  open,
  onClose,
  title,
  children,
  footer,
  panelClassName,
  variant = 'glass',
}: GlassModalProps) {
  if (variant === 'solid') {
    // The Modal's opaque dark surface carries the panel — drop the
    // translucent inner wrapper so the form sits cleanly against the
    // dark Modal frame instead of layering an extra frosted layer.
    return (
      <Modal open={open} onClose={onClose} title={title} footer={footer}>
        {children}
      </Modal>
    );
  }

  const panelClasses = [PANEL_BASE_CLASSES, panelClassName].filter(Boolean).join(' ');

  return (
    <Modal open={open} onClose={onClose} title={title} footer={footer}>
      <div className={panelClasses}>{children}</div>
    </Modal>
  );
}
