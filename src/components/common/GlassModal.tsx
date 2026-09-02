/*
 * p0ui.1 — GlassModal.
 *
 * Lightweight glass wrapper over the existing <Modal> (Modal.tsx,
 * p0e.3). GlassModal does NOT replace Modal — it composes it so all
 * existing escape/backdrop/focus behavior stays intact and the
 * 25+ existing callers keep working unchanged.
 *
 * Strategy: pass identical props to Modal and wrap the `children` in
 * a div that carries the new glass tokens (bg-glass-strong,
 * backdrop-blur-glass-lg, glass border, glass-panel shadow). The
 * outer Modal card still has its cyan title bar / footer; the inner
 * glass surface is where the body content sits, creating a layered
 * translucency effect that reads as "panel inside a panel" — a
 * common glassmorphism pattern.
 *
 * `panelClassName` lets callers extend the inner surface (e.g. for
 * custom padding or extra utility classes). It is concatenated AFTER
 * the base glass classes so callers cannot strip them.
 */
import { type ReactNode } from 'react';

import { Modal } from '../portal/Modal';

interface GlassModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  /** Extra classes appended to the inner glass surface. */
  readonly panelClassName?: string;
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
}: GlassModalProps) {
  const panelClasses = [PANEL_BASE_CLASSES, panelClassName].filter(Boolean).join(' ');

  return (
    <Modal open={open} onClose={onClose} title={title} footer={footer}>
      <div className={panelClasses}>{children}</div>
    </Modal>
  );
}
