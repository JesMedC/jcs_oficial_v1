/*
 * design-system-v1 — Toast presentational primitive (Wave 4c,
 * T4.11-presentational).
 *
 * Glassmorphic notification card rendered by `<ToastContainer>`
 * (Wave 4c) for every entry in the `useToastStore` queue.
 * Presentational only — all state lives in the store; the parent
 * container wires the `onDismiss` callback back to
 * `useToastStore.dismiss`.
 *
 * Composition (per orchestrator brief + design.md §4.11 +
 * `specs/primitive-library/spec.md` Requirement: Toast):
 *   - container: `flex items-start gap-3 p-4 rounded-glass
 *     bg-surface/95 backdrop-blur-glass border shadow-glass-panel`
 *   - severity-driven border:
 *       success → `border-primary/40`
 *       info    → `border-info/40`
 *       warning → `border-warning/40`
 *       error   → `border-loss/40`
 *   - severity icon: a 4×4 inline `<span>` carrying the severity's
 *     bg colour. Inline (NOT `<StatusDot>`) because the dot is
 *     decorative chrome here — `<StatusDot>` owns `role="status"`
 *     which would collide with the container's `role="status"`,
 *     and nesting it inside `aria-hidden` makes it invisible to
 *     testing-library role queries. Decorative chrome stays
 *     outside the a11y tree.
 *   - message: `<p className="text-sm text-text-primary flex-1">`
 *   - close button: `<button aria-label="Dismiss notification">`
 *     with the × glyph (Unicode U+00D7)
 *
 * Accessibility:
 *   - `role="status"` + `aria-live="polite"` for success / info /
 *     warning (non-urgent)
 *   - `role="alert"` + `aria-live="assertive"` for error (urgent)
 *   - the severity icon span carries `aria-hidden="true"` so it
 *     never announces itself to screen readers (the message and
 *     the container's role carry the announcement)
 *   - the close button carries a Spanish-agnostic English
 *     aria-label ("Dismiss notification") so the same primitive
 *     works in any locale the project ships to
 *
 * Why no `clsx`: same Wave 1 read-only rule. Class composition is
 * a `[...].filter(Boolean).join(' ')` chain.
 */
import type { ToastSeverity } from '../../stores/useToastStore';
import type { Toast as ToastData } from '../../stores/useToastStore';

export interface ToastProps {
  readonly toast: ToastData;
  readonly onDismiss: (id: string) => void;
  /** Optional className appended to the container. */
  readonly className?: string;
}

const CONTAINER_BASE_CLASSES =
  'flex items-start gap-3 p-4 rounded-glass bg-surface/95 backdrop-blur-glass border shadow-glass-panel';

const BORDER_CLASSES: Record<ToastSeverity, string> = {
  success: 'border-primary/40',
  info: 'border-info/40',
  warning: 'border-warning/40',
  error: 'border-loss/40',
};

const DOT_BG_CLASSES: Record<ToastSeverity, string> = {
  success: 'bg-primary',
  info: 'bg-info',
  warning: 'bg-warning',
  error: 'bg-loss',
};

const MESSAGE_CLASSES = 'text-sm text-text-primary flex-1';

const CLOSE_BUTTON_CLASSES =
  'shrink-0 text-text-secondary hover:text-text-primary transition-colors';

export function Toast({
  toast,
  onDismiss,
  className,
}: ToastProps): JSX.Element {
  const isError = toast.severity === 'error';

  const containerClasses = [
    CONTAINER_BASE_CLASSES,
    BORDER_CLASSES[toast.severity],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className={containerClasses}
    >
      <span
        aria-hidden="true"
        data-severity={toast.severity}
        className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${DOT_BG_CLASSES[toast.severity]}`}
      />
      <p className={MESSAGE_CLASSES}>{toast.message}</p>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
        className={CLOSE_BUTTON_CLASSES}
      >
        {'\u00d7'}
      </button>
    </div>
  );
}
