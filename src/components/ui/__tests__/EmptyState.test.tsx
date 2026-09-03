/*
 * design-system-v1 — EmptyState primitive unit tests (Wave 4c, T4.7).
 *
 * Pins the visual + behavioural contract from
 * `specs/primitive-library/spec.md` (Requirement: EmptyState) +
 * design.md §4.9 + the orchestrator's per-primitive brief:
 *   - container: `<div role="status">` with `flex flex-col
 *     items-center justify-center py-12 px-6 text-center`
 *   - icon slot: optional, wrapped in `<div className="mb-4
 *     text-primary/60">`
 *   - title: `<h3>` with `text-xl font-display uppercase
 *     tracking-wide text-text-primary mb-2`
 *   - description: optional `<p>` with `text-text-secondary text-sm
 *     max-w-md mb-6`
 *   - CTA slot: optional `<div className="mt-2">` wrapper
 *   - `role="status"` announces the empty state to screen readers
 *   - custom className is appended to the container
 *
 * Why no `clsx`: same Wave 1 read-only rule. Class composition is
 * a `[...].filter(Boolean).join(' ')` chain. Behavioural outcomes
 * (slot rendering, role, class composition) are pinned by this
 * test file.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  describe('title', () => {
    it('renders the title as the root heading (h3)', () => {
      render(<EmptyState title="Sin trades" />);

      expect(
        screen.getByRole('heading', { level: 3, name: 'Sin trades' }),
      ).toBeInTheDocument();
    });

    it('applies the title chrome classes (text-xl font-display uppercase tracking-wide text-text-primary mb-2)', () => {
      render(<EmptyState title="Sin cuentas" />);
      const title = screen.getByRole('heading', { level: 3 });

      expect(title).toHaveClass('text-xl');
      expect(title).toHaveClass('font-display');
      expect(title).toHaveClass('uppercase');
      expect(title).toHaveClass('tracking-wide');
      expect(title).toHaveClass('text-text-primary');
      expect(title).toHaveClass('mb-2');
    });
  });

  describe('description', () => {
    it('renders the description as a paragraph when provided', () => {
      render(<EmptyState title="Sin trades" description="Aun no registras operaciones." />);

      expect(screen.getByText('Aun no registras operaciones.')).toBeInTheDocument();
      expect(screen.getByText('Aun no registras operaciones.')).toHaveProperty(
        'tagName',
        'P',
      );
    });

    it('description chrome: text-text-secondary text-sm max-w-md mb-6', () => {
      render(<EmptyState title="X" description="descripcion" />);
      const description = screen.getByText('descripcion');

      expect(description).toHaveClass('text-text-secondary');
      expect(description).toHaveClass('text-sm');
      expect(description).toHaveClass('max-w-md');
      expect(description).toHaveClass('mb-6');
    });

    it('omits the description paragraph when not provided', () => {
      render(<EmptyState title="Sin trades" />);

      expect(screen.queryByText(/descripcion/i)).toBeNull();
      // The container still renders, but only with the title (no <p>).
      const container = screen.getByRole('status');
      expect(container.querySelectorAll('p').length).toBe(0);
    });
  });

  describe('icon', () => {
    it('renders the icon inside a wrapper div with the icon chrome classes', () => {
      render(
        <EmptyState
          title="Sin trades"
          icon={<svg data-testid="empty-icon" />}
        />,
      );

      const wrapper = screen.getByTestId('empty-icon').parentElement;
      expect(wrapper).not.toBeNull();
      expect(wrapper!.tagName).toBe('DIV');
      expect(wrapper).toHaveClass('mb-4');
      expect(wrapper).toHaveClass('text-primary/60');
    });

    it('omits the icon wrapper when no icon is provided', () => {
      render(<EmptyState title="Sin trades" />);

      const container = screen.getByRole('status');
      // The container should still render with only the title — no
      // empty wrapper div sitting around.
      expect(container.querySelectorAll('div').length).toBe(0);
    });
  });

  describe('cta', () => {
    it('renders the CTA inside a wrapper div with mt-2 when provided', () => {
      render(
        <EmptyState
          title="Sin trades"
          cta={<button type="button">Crear trade</button>}
        />,
      );

      const ctaButton = screen.getByRole('button', { name: 'Crear trade' });
      const wrapper = ctaButton.parentElement;

      expect(wrapper).not.toBeNull();
      expect(wrapper!.tagName).toBe('DIV');
      expect(wrapper).toHaveClass('mt-2');
    });

    it('omits the CTA wrapper when not provided', () => {
      render(<EmptyState title="Sin trades" />);

      expect(screen.queryByRole('button')).toBeNull();
    });
  });

  describe('container + accessibility', () => {
    it('container has flex flex-col items-center justify-center py-12 px-6 text-center', () => {
      render(<EmptyState title="Sin trades" />);
      const container = screen.getByRole('status');

      expect(container).toHaveClass('flex');
      expect(container).toHaveClass('flex-col');
      expect(container).toHaveClass('items-center');
      expect(container).toHaveClass('justify-center');
      expect(container).toHaveClass('py-12');
      expect(container).toHaveClass('px-6');
      expect(container).toHaveClass('text-center');
    });

    it('container has role="status" so screen readers announce the empty state', () => {
      render(<EmptyState title="Sin trades" />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders without optional props (icon / description / cta) without crashing', () => {
      expect(() => render(<EmptyState title="Solo titulo" />)).not.toThrow();

      expect(screen.getByRole('heading', { level: 3, name: 'Solo titulo' })).toBeInTheDocument();
    });
  });

  describe('className passthrough', () => {
    it('appends custom className to the container', () => {
      render(<EmptyState title="X" className="my-8 bg-surface" />);
      const container = screen.getByRole('status');

      expect(container).toHaveClass('my-8');
      expect(container).toHaveClass('bg-surface');
      // Base classes still present.
      expect(container).toHaveClass('flex');
      expect(container).toHaveClass('text-center');
    });
  });
});
