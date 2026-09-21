/*
 * design-system-v1 — ToastContainer mount-once component (Wave 4c,
 * T4.11-container).
 *
 * Pinned top-right slot that renders one `<Toast>` per entry in the
 * `useToastStore` queue. Designed to be mounted ONCE at the app
 * root (Wave 7 mounts it in `AppShell` and `PortalShell`). This
 * primitive ships the visual + behaviour but the actual mounting
 * in shells is a Wave 7 task — until then, this component is
 * available for any page that wants to mount it locally.
 *
 * Composition (per orchestrator brief + design.md §4.11):
 *   - container: `<div role="region" aria-label="Notifications">`
 *     with `fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm
 *     w-full pointer-events-none`
 *   - each toast wrapped in a `<div className="pointer-events-auto
 *     jcs-toast-slide-in">` so:
 *     1. The dismiss button receives clicks (the container's
 *        `pointer-events-none` is needed so the empty slot doesn't
 *        block clicks on the underlying app surface)
 *     2. The toast slides in from the right edge on mount via
 *        the inline keyframe declared in the component
 *   - slide-in animation: inline `@keyframes jcs-toast-slide-in`
 *        from `translateX(100%); opacity: 0;` to
 *        `translateX(0); opacity: 1;` over 300ms ease-out
 *     The keyframe is defined inline (NOT in tailwind.config.ts)
 *     because Wave 4c is a read-only mandate for the config. The
 *     keyframe name is namespaced (`jcs-toast-slide-in`) to avoid
 *     collisions with anything else in the bundle.
 *
 * Accessibility:
 *   - container `role="region"` + `aria-label="Notifications"`
 *     groups the toasts as a notifications region
 *   - individual toasts carry their own `role="status"|"alert"`
 *     and `aria-live` (see `<Toast>` primitive)
 *
 * Why no `clsx`: same Wave 1 read-only rule. Class composition is
 * a `[...].filter(Boolean).join(' ')` chain.
 */
import { Toast } from './Toast';
import { useToastStore } from '../../stores/useToastStore';

export interface ToastContainerProps {
  /** Optional className appended to the container. */
  readonly className?: string;
}

const CONTAINER_BASE_CLASSES =
  'fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none';

const SLOT_CLASSES = 'pointer-events-auto jcs-toast-slide-in';

export function ToastContainer({
  className,
}: ToastContainerProps): JSX.Element | null {
  // Subscribe to the queue. Using selectors narrows the re-render
  // surface to the queue slice only; the dismiss handler is
  // referentially stable (the function is defined once in the
  // create() call) so subscribing to it via a selector does NOT
  // cause re-renders when dismiss is called — only the queue
  // slice change triggers a re-render.
  const queue = useToastStore((state) => state.queue);
  const dismiss = useToastStore((state) => state.dismiss);

  if (queue.length === 0) {
    return null;
  }

  const containerClasses = [CONTAINER_BASE_CLASSES, className]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      {/*
       * Inline keyframe + class for the slide-in animation. Kept
       * inside the component (instead of tailwind.config.ts) so
       * Wave 4c stays a no-touch commit on the design-system config.
       * The class name is namespaced (`jcs-toast-slide-in`) so it
       * never collides with anything else in the bundle.
       */}
      <style>
        {`@keyframes jcs-toast-slide-in {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
          .jcs-toast-slide-in {
            animation: jcs-toast-slide-in 300ms ease-out;
          }`}
      </style>
      <div role="region" aria-label="Notifications" className={containerClasses}>
        {queue.map((toast) => (
          <div key={toast.id} className={SLOT_CLASSES}>
            <Toast toast={toast} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </>
  );
}
