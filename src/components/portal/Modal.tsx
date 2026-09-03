/*
 * p0e.3 — Reusable Modal.
 *
 * Lightweight modal primitive used by FundWithdrawModal and
 * DeleteAccountDialog. Renders a fixed overlay (bg-black/60) with a
 * centered glass card (jade border, glassmorphism — same palette as
 * the project's <GlassCard>).
 *
 * Closes on Escape and on backdrop click (target === currentTarget).
 * No portal: a single fixed-position div with z-50 is enough; nested
 * modals would have to revisit this assumption.
 *
 * Per mem #68, the user-facing strings live in Spanish.
 */
import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-[rgba(13,21,30,0.7)] backdrop-blur-[12px] border border-[rgba(0,255,157,0.15)] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(0,255,157,0.15)]">
          <h2 className="font-display uppercase tracking-wide text-primary text-base md:text-lg">
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
        <div className="px-5 py-4">{children}</div>
        {footer !== undefined ? (
          <div className="px-5 py-4 border-t border-[rgba(0,255,157,0.15)] flex justify-end gap-2 bg-[#060B10]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
