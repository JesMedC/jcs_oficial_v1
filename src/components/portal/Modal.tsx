/*
 * p0e.3 — Reusable Modal.
 *
 * Lightweight modal primitive used by FundWithdrawModal,
 * DeleteAccountDialog, QuickActionModals, and the close-trade flow
 * (CloseTradeModal via GlassModal).
 *
 * dvc-01 — portal / stacking / viewport / focus lifecycle.
 *   - Mounted via `createPortal(..., document.body)` so a
 *     `backdrop-filter` / `transform` / `overflow-hidden` ancestor
 *     in the calling subtree cannot trap the descendant `z-50` layer.
 *     The recent-activity feed's `backdrop-blur-md` card was the
 *     concrete trap; this is the regression DVC-01 fixes.
 *   - Body is viewport-aware: `max-h-[calc(100dvh-2rem)]` +
 *     `overflow-y-auto` keeps the form scrollable inside the panel
 *     so the footer CTAs stay anchored on mobile viewports.
 *   - Footer slot is rendered as a flex sibling of the scrollable
 *     body (NOT a child) — actions placed in the footer remain
 *     reachable without dismissing the modal even when the form is
 *     long enough to scroll.
 *   - Focus lifecycle: on open, focus moves to the first focusable
 *     element inside the panel (or the close button if none);
 *     Tab/Shift+Tab cycle within the panel; on close, focus is
 *     restored to the previously focused element.
 *   - A11y surface: `role="dialog"`, `aria-modal="true"`,
 *     `aria-labelledby` pointing to the title id (and
 *     `aria-describedby` when the caller supplies a description id).
 *   - Background inertness: while open, every sibling of the portal
 *     node in `document.body` is marked `inert` + `aria-hidden` so
 *     the rest of the page is non-interactive for assistive tech
 *     and mouse users alike.
 *   - Escape and backdrop click close the modal (regression-locked).
 *
 * Per mem #68, the user-facing strings live in Spanish.
 */
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  /**
   * Optional id of a description node rendered by the caller. When
   * supplied, the dialog references it via `aria-describedby` so
   * screen readers announce the description in addition to the
   * title. The caller remains responsible for the description node
   * itself — this prop is purely the bridge.
   */
  readonly 'aria-describedby'?: string;
}

// Focusable selector — exhaustive list of natively focusable HTML
// elements we want to be reachable inside the modal. Anything with
// an explicit positive tabindex is included via the catch-all rule.
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusablesIn(panel: HTMLElement | null): HTMLElement[] {
  if (!panel) return [];
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.tabIndex !== -1 && !el.hasAttribute('disabled'),
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  'aria-describedby': ariaDescribedBy,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const prevActiveRef = useRef<HTMLElement | null>(null);

  // Keyboard lifecycle: Escape closes, Tab/Shift+Tab cycles within
  // the panel. The handler is bound while the modal is open and
  // removed on close / unmount.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = focusablesIn(panel);
      const active = document.activeElement as HTMLElement | null;
      if (focusables.length === 0 || !panel.contains(active)) {
        // No focusable targets inside the panel (or focus has drifted
        // outside via the inert background) — keep focus inside the
        // panel rather than letting Tab escape to the page.
        e.preventDefault();
        (focusables[0] ?? panel).focus();
        return;
      }
      // Move focus manually on every Tab so the trap works in jsdom
      // (which does not natively advance focus on Tab) AND in real
      // browsers (where the trap would otherwise leak past the wrap).
      const idx = active ? focusables.indexOf(active) : -1;
      e.preventDefault();
      const nextIdx = e.shiftKey
        ? (idx <= 0 ? focusables.length - 1 : idx - 1)
        : (idx === -1 || idx === focusables.length - 1 ? 0 : idx + 1);
      const nextFocusable = focusables[nextIdx];
      if (nextFocusable) {
        nextFocusable.focus();
      } else {
        panel.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Focus lifecycle + background inertness. Captures the previously
  // focused element on open, restores it on close, and marks every
  // document.body sibling of the portal as inert + aria-hidden so
  // the rest of the page cannot receive focus while the modal is
  // open.
  useEffect(() => {
    if (!open) return;
    const prevActive = (document.activeElement as HTMLElement | null) ?? null;
    prevActiveRef.current = prevActive;

    const portalNode = portalRef.current;
    const siblings = Array.from(document.body.children).filter(
      (el) => el !== portalNode,
    );
    // Remember the original inert / aria-hidden state of each sibling
    // so we restore it exactly on close (not all siblings start clean).
    const prevStates = siblings.map((el) => ({
      hadInert: el.hasAttribute('inert'),
      hadAriaHidden: el.getAttribute('aria-hidden'),
    }));
    siblings.forEach((el) => {
      el.setAttribute('inert', '');
      el.setAttribute('aria-hidden', 'true');
    });

    // Initial focus — first focusable inside the panel; the close
    // button is the fallback when the panel has no other targets.
    // We defer to the next frame so the portal's DOM nodes are
    // committed before we move focus.
    const focusFrame = window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = focusablesIn(panel);
      const closeBtn = panel.querySelector<HTMLElement>('[data-modal-close]');
      const target: HTMLElement = focusables[0] ?? closeBtn ?? panel;
      target.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      siblings.forEach((el, i) => {
        const prev = prevStates[i];
        if (!prev) return;
        if (!prev.hadInert) el.removeAttribute('inert');
        if (prev.hadAriaHidden === null) {
          el.removeAttribute('aria-hidden');
        } else {
          el.setAttribute('aria-hidden', prev.hadAriaHidden);
        }
      });
      const prev = prevActiveRef.current;
      if (prev && typeof prev.focus === 'function') {
        prev.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  const dialogNode = (
    <div
      ref={portalRef}
      data-modal-portal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={ariaDescribedBy ?? descriptionId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        data-modal-panel="true"
        tabIndex={-1}
        className="w-full max-w-md bg-bg border border-jade/40 rounded-2xl shadow-[0_0_40px_rgba(0,212,216,0.18)] flex flex-col max-h-[calc(100dvh-2rem)] overflow-hidden outline-none"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-jade-border)] shrink-0">
          <h2
            id={titleId}
            className="font-display uppercase tracking-wide text-primary text-base md:text-lg"
          >
            {title}
          </h2>
          <button
            type="button"
            data-modal-close="true"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-text-muted hover:text-text-primary text-lg leading-none"
          >
            ×
          </button>
        </div>
        <div
          data-modal-body="true"
          className="px-5 py-4 overflow-y-auto flex-1 min-h-0"
        >
          {children}
        </div>
        {footer !== undefined ? (
          <div
            data-modal-footer="true"
            className="px-5 py-4 border-t border-[var(--color-jade-border)] flex justify-end gap-2 bg-bg shrink-0"
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(dialogNode, document.body);
}
