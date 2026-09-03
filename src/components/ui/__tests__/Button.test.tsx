/*
 * design-system-v1 — Button primitive unit tests (Wave 4a, T4a.1).
 *
 * Contract pins the visual + behavioural surface from
 * `specs/primitive-library/spec.md` and `design.md` §4.1:
 *   - 4 variants: primary | ghost | danger | icon
 *   - 3 sizes: sm | md | lg
 *   - loading: aria-busy, disables click, replaces leftIcon with a
 *     jade spinner
 *   - disabled: aria-disabled, disables click, opacity-50 +
 *     cursor-not-allowed
 *   - forwardRef so RHF `register('name', { ref })` can target it
 *   - focus-visible ring per cyber-jade-tokens spec
 *
 * Class-name assertions mirror the project convention used by
 * GlassPanel.test.tsx — every primitive in `src/components/ui/`
 * ships its design contract via Tailwind class composition.
 */
import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Button } from '../Button';

describe('Button', () => {
  describe('variants', () => {
    it('renders variant=primary with jade border + text-primary', () => {
      render(<Button variant="primary">Aceptar</Button>);
      const button = screen.getByRole('button', { name: 'Aceptar' });

      expect(button).toHaveClass('border-primary');
      expect(button).toHaveClass('text-primary');
    });

    it('primary hover fills the surface (bg-primary + text-primary-fg + glow)', () => {
      render(<Button variant="primary">Aceptar</Button>);
      const button = screen.getByRole('button', { name: 'Aceptar' });

      expect(button).toHaveClass('hover:bg-primary');
      expect(button).toHaveClass('hover:text-primary-fg');
      expect(button).toHaveClass('hover:shadow-glow-jade-sm');
    });

    it('renders variant=ghost without a border and with a soft hover tint', () => {
      render(<Button variant="ghost">Cancelar</Button>);
      const button = screen.getByRole('button', { name: 'Cancelar' });

      expect(button).toHaveClass('text-primary');
      expect(button).toHaveClass('hover:bg-primary/10');
      expect(button).not.toHaveClass('border-primary');
    });

    it('renders variant=danger with border-loss + text-loss', () => {
      render(<Button variant="danger">Eliminar</Button>);
      const button = screen.getByRole('button', { name: 'Eliminar' });

      expect(button).toHaveClass('border-loss');
      expect(button).toHaveClass('text-loss');
    });

    it('renders variant=icon as a square (p-2, hover tint, no border)', () => {
      render(<Button variant="icon" aria-label="Cerrar" />);
      const button = screen.getByRole('button', { name: 'Cerrar' });

      expect(button).toHaveClass('p-2');
      expect(button).toHaveClass('hover:bg-primary/10');
      expect(button).not.toHaveClass('border-primary');
    });
  });

  describe('display typography', () => {
    it('all non-icon variants apply font-display uppercase tracking-wider', () => {
      render(<Button variant="primary">Display</Button>);
      const button = screen.getByRole('button', { name: 'Display' });

      expect(button).toHaveClass('font-display');
      expect(button).toHaveClass('uppercase');
      expect(button).toHaveClass('tracking-wider');
    });
  });

  describe('sizes', () => {
    it('size=sm renders px-3 py-1 text-sm', () => {
      render(<Button size="sm">Sm</Button>);
      const button = screen.getByRole('button', { name: 'Sm' });

      expect(button).toHaveClass('px-3');
      expect(button).toHaveClass('py-1');
      expect(button).toHaveClass('text-sm');
    });

    it('size=md renders px-4 py-2 text-base', () => {
      render(<Button size="md">Md</Button>);
      const button = screen.getByRole('button', { name: 'Md' });

      expect(button).toHaveClass('px-4');
      expect(button).toHaveClass('py-2');
      expect(button).toHaveClass('text-base');
    });

    it('size=lg renders px-6 py-3 text-lg', () => {
      render(<Button size="lg">Lg</Button>);
      const button = screen.getByRole('button', { name: 'Lg' });

      expect(button).toHaveClass('px-6');
      expect(button).toHaveClass('py-3');
      expect(button).toHaveClass('text-lg');
    });
  });

  describe('loading state', () => {
    it('loading=true sets aria-busy="true"', () => {
      render(<Button loading>Cargando</Button>);
      const button = screen.getByRole('button', { name: 'Cargando' });

      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('loading=true suppresses onClick (userEvent.click does not fire the handler)', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(
        <Button loading onClick={onClick}>
          Cargando
        </Button>,
      );
      const button = screen.getByRole('button', { name: 'Cargando' });

      await user.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('loading=true renders a spinner in place of the leftIcon slot', () => {
      render(
        <Button loading leftIcon={<span data-testid="left">L</span>}>
          Cargando
        </Button>,
      );

      expect(screen.queryByTestId('left')).toBeNull();
      expect(screen.getByTestId('button-spinner')).toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    it('disabled sets aria-disabled="true" and the disabled attribute', () => {
      render(<Button disabled>Off</Button>);
      const button = screen.getByRole('button', { name: 'Off' });

      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('disabled suppresses onClick', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(
        <Button disabled onClick={onClick}>
          Off
        </Button>,
      );
      const button = screen.getByRole('button', { name: 'Off' });

      await user.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('disabled applies opacity-50 cursor-not-allowed', () => {
      render(<Button disabled>Off</Button>);
      const button = screen.getByRole('button', { name: 'Off' });

      expect(button).toHaveClass('opacity-50');
      expect(button).toHaveClass('cursor-not-allowed');
    });
  });

  describe('forwardRef', () => {
    it('attaches the forwarded ref to the underlying <button> element', () => {
      const ref = createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Con ref</Button>);

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current).toBe(screen.getByRole('button', { name: 'Con ref' }));
    });
  });

  describe('focus-visible', () => {
    it('applies focus-visible ring classes (focus-visible:ring-2 + focus-visible:ring-primary)', () => {
      render(<Button>Focus</Button>);
      const button = screen.getByRole('button', { name: 'Focus' });

      expect(button).toHaveClass('focus-visible:ring-2');
      expect(button).toHaveClass('focus-visible:ring-primary');
      expect(button).toHaveClass('focus-visible:outline-none');
    });
  });

  describe('passthrough props', () => {
    it('forwards type="submit" so the button can drive a form', () => {
      render(<Button type="submit">Enviar</Button>);
      const button = screen.getByRole('button', { name: 'Enviar' });

      expect(button).toHaveAttribute('type', 'submit');
    });

    it('defaults to type="button" to avoid accidental form submits', () => {
      render(<Button>Default</Button>);
      const button = screen.getByRole('button', { name: 'Default' });

      expect(button).toHaveAttribute('type', 'button');
    });
  });
});