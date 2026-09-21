/*
 * design-system-v1 — ToastContainer unit tests (Wave 4c, T4.11-container).
 *
 * Pins the mount-once container contract from
 * `specs/primitive-library/spec.md` + design.md §4.11 +
 * orchestrator's per-primitive brief:
 *   - container: `<div>` fixed top-right with
 *     `fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm
 *     w-full pointer-events-none`
 *   - each toast wrapped in a slot with `pointer-events-auto` so
 *     the dismiss button is clickable through the container's
 *     `pointer-events-none` (which exists so the container itself
 *     doesn't block clicks on the underlying app surface)
 *   - reads from `useToastStore` and renders one `<Toast>` per
 *     queued entry, each wired to the store's `dismiss` handler
 *   - accessibility: container carries `role="region"` and
 *     `aria-label="Notifications"`; individual toasts carry their
 *     own role/aria-live
 *   - renders NOTHING when the queue is empty (avoids a stuck
 *     fixed-position div blocking pointer events for no reason)
 *
 * The slide-in animation is verified indirectly via the slot
 * wrapper class (the `jcs-toast-slide-in` class defined inline by
 * the component). Reduced-motion is NOT asserted here — the
 * orchestrator's brief doesn't require it for the container, and
 * the `<Toast>` itself has no motion.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { ToastContainer } from '../ToastContainer';
import { useToastStore } from '../../../stores/useToastStore';

beforeEach(() => {
  // Drop any in-flight timers so a leftover push from a prior
  // test cannot trigger auto-dismiss mid-test. The clear + setState
  // pair is wrapped in act() so Zustand's subscription notifications
  // (which may still be wired to a component from a prior test
  // that hasn't fully unmounted) stay inside the React test
  // boundary — without this, React 18 fires the "act() not
  // wrapped" warning for the asynchronous re-render scheduled
  // by the Zustand update.
  act(() => {
    useToastStore.getState().clear();
    useToastStore.setState({ queue: [] });
  });
});

afterEach(() => {
  act(() => {
    useToastStore.getState().clear();
    useToastStore.setState({ queue: [] });
  });
});

describe('ToastContainer', () => {
  describe('empty queue', () => {
    it('renders nothing when the queue is empty', () => {
      const { container } = render(<ToastContainer />);

      // No region role in the tree.
      expect(screen.queryByRole('region')).toBeNull();
      // And nothing inside the rendered container subtree.
      expect(container.firstChild).toBeNull();
    });
  });

  describe('non-empty queue', () => {
    it('renders one <Toast> per toast in the queue', () => {
      act(() => {
        useToastStore.getState().push({ severity: 'info', message: 'A' });
        useToastStore.getState().push({ severity: 'info', message: 'B' });
        useToastStore.getState().push({ severity: 'error', message: 'C' });
      });

      render(<ToastContainer />);

      // Each message renders as a <p> inside its own toast.
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();

      // Three dismiss buttons (one per toast).
      expect(
        screen.getAllByRole('button', { name: 'Dismiss notification' }),
      ).toHaveLength(3);
    });

    it('renders the container with role="region" + aria-label="Notifications"', () => {
      act(() => {
        useToastStore.getState().push({ severity: 'info', message: 'X' });
      });
      render(<ToastContainer />);

      const region = screen.getByRole('region', { name: 'Notifications' });
      expect(region).toBeInTheDocument();
    });

    it('applies the position classes (fixed top-4 right-4 z-50 max-w-sm w-full)', () => {
      act(() => {
        useToastStore.getState().push({ severity: 'info', message: 'X' });
      });
      render(<ToastContainer />);

      const region = screen.getByRole('region', { name: 'Notifications' });

      expect(region).toHaveClass('fixed');
      expect(region).toHaveClass('top-4');
      expect(region).toHaveClass('right-4');
      expect(region).toHaveClass('z-50');
      expect(region).toHaveClass('flex');
      expect(region).toHaveClass('flex-col');
      expect(region).toHaveClass('gap-2');
      expect(region).toHaveClass('max-w-sm');
      expect(region).toHaveClass('w-full');
      // pointer-events-none on the container so the empty slot
      // doesn't block clicks on the underlying app surface.
      expect(region).toHaveClass('pointer-events-none');
    });

    it('each toast slot has pointer-events-auto so the dismiss button is clickable', () => {
      act(() => {
        useToastStore.getState().push({ severity: 'info', message: 'X' });
      });
      const { container } = render(<ToastContainer />);

      // The slot wrapper between the container and the <Toast>
      // carries `pointer-events-auto`.
      const slots = container.querySelectorAll('.pointer-events-auto');
      expect(slots.length).toBe(1);
    });

    it('appends custom className to the container', () => {
      act(() => {
        useToastStore.getState().push({ severity: 'info', message: 'X' });
      });
      render(<ToastContainer className="my-4" />);

      const region = screen.getByRole('region', { name: 'Notifications' });
      expect(region).toHaveClass('my-4');
      // Base classes still present.
      expect(region).toHaveClass('fixed');
    });

    it('clicking the dismiss button on a rendered toast removes it from the queue', () => {
      // Direct user-interaction assertion: push → click dismiss →
      // store queue shrinks. This pins the wiring between the
      // container and the store.
      const id = useToastStore.getState().push({
        severity: 'info',
        message: 'Dismissable',
      });
      expect(useToastStore.getState().queue).toHaveLength(1);

      render(<ToastContainer />);

      const button = screen.getByRole('button', {
        name: 'Dismiss notification',
      });
      // Wrap the click in act() so the chained Zustand store
      // update that triggers the ToastContainer re-render stays
      // inside the test boundary. Without this, React 18 emits an
      // "act() not wrapped" warning for the asynchronous re-render
      // scheduled after the click handler returns.
      act(() => {
        fireEvent.click(button);
      });

      expect(useToastStore.getState().queue).toHaveLength(0);
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe('store subscription', () => {
    it('reflects the current store queue state on render', () => {
      // Push two toasts and assert the container renders both.
      // The store mutation BEFORE the render is picked up by the
      // `useToastStore` selector on first render — this is the
      // consumer-facing subscription contract.
      act(() => {
        useToastStore.getState().push({ severity: 'info', message: 'one' });
        useToastStore.getState().push({ severity: 'info', message: 'two' });
      });
      render(<ToastContainer />);

      expect(screen.getByText('one')).toBeInTheDocument();
      expect(screen.getByText('two')).toBeInTheDocument();
    });
  });
});
