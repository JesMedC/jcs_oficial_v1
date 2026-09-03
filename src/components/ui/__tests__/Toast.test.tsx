/*
 * design-system-v1 — Toast presentational unit tests (Wave 4c,
 * T4.11-presentational).
 *
 * Pins the presentational contract from
 * `specs/primitive-library/spec.md` (Requirement: Toast) +
 * design.md §4.11 + the orchestrator's per-primitive brief:
 *   - container: `flex items-start gap-3 p-4 rounded-glass
 *     bg-surface/95 backdrop-blur-glass border shadow-glass-panel`
 *   - severity-driven border colour:
 *       success → `border-primary/40`
 *       info    → `border-info/40`
 *       warning → `border-warning/40`
 *       error   → `border-loss/40`
 *   - severity icon: a `<StatusDot variant={...} size="sm"
 *     pulse={false} />` (the Wave 4b primitive)
 *   - message: `<p className="text-sm text-text-primary flex-1">`
 *   - close button: `<button>` with `aria-label="Dismiss
 *     notification"` rendering ×
 *   - accessibility: `role="status"` for non-error; `role="alert"`
 *     for error; `aria-live="polite"` for success/info/warning;
 *     `aria-live="assertive"` for error
 *   - the close button click calls `onDismiss(toast.id)`
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { Toast } from '../Toast';
import type { Toast as ToastData } from '../../../stores/useToastStore';

function makeToast(overrides: Partial<ToastData> = {}): ToastData {
  return {
    id: 'test-id-1',
    message: 'Operacion exitosa',
    severity: 'success',
    ...overrides,
  };
}

describe('Toast', () => {
  describe('message', () => {
    it('renders the toast message inside a <p>', () => {
      const toast = makeToast({ message: 'Guardado' });
      render(<Toast toast={toast} onDismiss={() => {}} />);

      const message = screen.getByText('Guardado');
      expect(message).toBeInTheDocument();
      expect(message.tagName).toBe('P');
    });

    it('message has the chrome classes (text-sm text-text-primary flex-1)', () => {
      const toast = makeToast({ message: 'X' });
      render(<Toast toast={toast} onDismiss={() => {}} />);

      const message = screen.getByText('X');
      expect(message).toHaveClass('text-sm');
      expect(message).toHaveClass('text-text-primary');
      expect(message).toHaveClass('flex-1');
    });
  });

  describe('severity icon', () => {
    function getDotForSeverity(severity: 'success' | 'info' | 'warning' | 'error'): HTMLElement {
      // The dot is a decorative span with `data-severity={severity}`
      // and `aria-hidden="true"`. We query by data attribute so the
      // query is independent of any role collision with the
      // container (which is itself `role="status"` or
      // `role="alert"`).
      const dot = document.querySelector(`[data-severity="${severity}"]`);
      if (!(dot instanceof HTMLElement)) {
        throw new Error(`severity dot not found for severity=${severity}`);
      }
      return dot;
    }

    it('renders a severity dot for the success colour (bg-primary)', () => {
      const toast = makeToast({ severity: 'success' });
      const { container } = render(<Toast toast={toast} onDismiss={() => {}} />);

      // Render into a wrapping container so document.querySelector
      // only sees the toast subtree.
      const dot = getDotForSeverity('success');
      // First dot in the document IS the one we just rendered.
      expect(container.contains(dot)).toBe(true);
      expect(dot).toHaveClass('bg-primary');
      // decorative chrome — must not announce itself
      expect(dot).toHaveAttribute('aria-hidden', 'true');
    });

    it('info severity renders bg-info dot', () => {
      render(<Toast toast={makeToast({ severity: 'info' })} onDismiss={() => {}} />);

      const dot = getDotForSeverity('info');
      expect(dot).toHaveClass('bg-info');
    });

    it('warning severity renders bg-warning dot', () => {
      render(<Toast toast={makeToast({ severity: 'warning' })} onDismiss={() => {}} />);

      const dot = getDotForSeverity('warning');
      expect(dot).toHaveClass('bg-warning');
    });

    it('error severity renders bg-loss dot', () => {
      render(<Toast toast={makeToast({ severity: 'error' })} onDismiss={() => {}} />);

      const dot = getDotForSeverity('error');
      expect(dot).toHaveClass('bg-loss');
    });

    it('dot is rendered with the size classes (h-2 w-2 rounded-full)', () => {
      render(<Toast toast={makeToast({ severity: 'info' })} onDismiss={() => {}} />);

      const dot = getDotForSeverity('info');
      expect(dot).toHaveClass('h-2');
      expect(dot).toHaveClass('w-2');
      expect(dot).toHaveClass('rounded-full');
    });
  });

  describe('close button', () => {
    it('renders a close button with the aria-label "Dismiss notification"', () => {
      const toast = makeToast();
      render(<Toast toast={toast} onDismiss={() => {}} />);

      expect(
        screen.getByRole('button', { name: 'Dismiss notification' }),
      ).toBeInTheDocument();
    });

    it('clicking the close button calls onDismiss with the toast id', () => {
      const onDismiss = vi.fn();
      const toast = makeToast({ id: 'abc-123' });
      render(<Toast toast={toast} onDismiss={onDismiss} />);

      fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));

      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(onDismiss).toHaveBeenCalledWith('abc-123');
    });

    it('close button renders the × glyph', () => {
      const toast = makeToast();
      render(<Toast toast={toast} onDismiss={() => {}} />);

      const button = screen.getByRole('button', { name: 'Dismiss notification' });
      // The × glyph is rendered inside the button.
      expect(button.textContent).toContain('\u00d7');
    });
  });

  describe('accessibility (role + aria-live)', () => {
    it('severity=success: role="status" + aria-live="polite"', () => {
      const toast = makeToast({ severity: 'success' });
      render(<Toast toast={toast} onDismiss={() => {}} />);

      const container = screen.getByRole('status');
      expect(container).toHaveAttribute('aria-live', 'polite');
    });

    it('severity=info: role="status" + aria-live="polite"', () => {
      const toast = makeToast({ severity: 'info' });
      render(<Toast toast={toast} onDismiss={() => {}} />);

      const container = screen.getByRole('status');
      expect(container).toHaveAttribute('aria-live', 'polite');
    });

    it('severity=warning: role="status" + aria-live="polite"', () => {
      const toast = makeToast({ severity: 'warning' });
      render(<Toast toast={toast} onDismiss={() => {}} />);

      const container = screen.getByRole('status');
      expect(container).toHaveAttribute('aria-live', 'polite');
    });

    it('severity=error: role="alert" + aria-live="assertive"', () => {
      const toast = makeToast({ severity: 'error' });
      render(<Toast toast={toast} onDismiss={() => {}} />);

      const container = screen.getByRole('alert');
      expect(container).toHaveAttribute('aria-live', 'assertive');
    });
  });

  describe('border colour by severity', () => {
    const BORDER_CASES = [
      { severity: 'success' as const, expected: 'border-primary/40' },
      { severity: 'info' as const, expected: 'border-info/40' },
      { severity: 'warning' as const, expected: 'border-warning/40' },
      { severity: 'error' as const, expected: 'border-loss/40' },
    ];

    BORDER_CASES.forEach(({ severity, expected }) => {
      it(`severity=${severity} applies ${expected}`, () => {
        const toast = makeToast({ severity });
        render(<Toast toast={toast} onDismiss={() => {}} />);

        // The container has BOTH role="status"|role="alert" AND
        // the border class. We pick the right root by the role that
        // the severity resolves to.
        const container =
          severity === 'error'
            ? screen.getByRole('alert')
            : screen.getByRole('status');

        expect(container).toHaveClass(expected);
        // Base container chrome classes are still applied.
        expect(container).toHaveClass('flex');
        expect(container).toHaveClass('items-start');
        expect(container).toHaveClass('gap-3');
        expect(container).toHaveClass('p-4');
        expect(container).toHaveClass('rounded-glass');
        expect(container).toHaveClass('bg-surface/95');
        expect(container).toHaveClass('backdrop-blur-glass');
        expect(container).toHaveClass('border');
        expect(container).toHaveClass('shadow-glass-panel');
      });
    });
  });

  describe('className passthrough', () => {
    it('appends custom className to the container', () => {
      const toast = makeToast();
      render(<Toast toast={toast} onDismiss={() => {}} className="my-4" />);

      const container = screen.getByRole('status');
      expect(container).toHaveClass('my-4');
      // Base classes still present.
      expect(container).toHaveClass('flex');
    });
  });
});
