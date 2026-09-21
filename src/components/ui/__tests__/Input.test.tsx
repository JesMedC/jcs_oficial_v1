/*
 * design-system-v1 — Input primitive unit tests (Wave 4a, T4a.2).
 *
 * Pins the field-control contract from
 * `specs/primitive-library/spec.md` + `design.md` §4.2:
 *   - label / id association via htmlFor + id (id auto-generated
 *     via useId when the caller does not supply it)
 *   - hint renders via aria-describedby (target = `${id}-hint`)
 *   - error renders via aria-describedby (target = `${id}-error`)
 *     AND sets aria-invalid on the input
 *   - focus glow: `focus:border-primary focus:shadow-[0_0_5px_rgba(0,255,157,0.5)] focus:outline-none`
 *   - error focus: `focus:border-loss focus:shadow-[0_0_5px_rgba(255,42,85,0.5)]`
 *   - disabled: `opacity-50 cursor-not-allowed`
 *   - forwardRef so React Hook Form's `register('fieldName')` can
 *     target the input element
 */
import { describe, expect, it } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';

import { Input } from '../Input';

describe('Input', () => {
  describe('label association', () => {
    it('renders the label and wires htmlFor ↔ id when an id is provided', () => {
      render(<Input id="email" label="Email" />);

      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('id', 'email');
    });

    it('auto-generates an id when none is provided, and still wires htmlFor ↔ id', () => {
      render(<Input label="Email" />);

      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('id');
      // id is non-empty
      expect(input.getAttribute('id')).not.toBe('');
    });
  });

  describe('hint', () => {
    it('renders hint text when provided and wires aria-describedby to the hint id', () => {
      render(
        <Input
          id="email"
          label="Email"
          hint="Use your work email"
        />,
      );

      const input = screen.getByLabelText('Email');
      const hint = screen.getByText('Use your work email');

      expect(hint).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-describedby', 'email-hint');
    });

    it('does NOT render aria-describedby when no hint or error is provided', () => {
      render(<Input id="email" label="Email" />);
      const input = screen.getByLabelText('Email');

      expect(input).not.toHaveAttribute('aria-describedby');
    });
  });

  describe('error', () => {
    it('renders error text + sets aria-invalid when error is provided', () => {
      render(
        <Input
          id="email"
          label="Email"
          error="Email invalido"
        />,
      );

      const input = screen.getByLabelText('Email');
      const error = screen.getByText('Email invalido');

      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'email-error');
      expect(error).toBeInTheDocument();
    });

    it('error beats hint — when both are present, aria-describedby targets the error id only', () => {
      render(
        <Input
          id="email"
          label="Email"
          hint="Use your work email"
          error="Email invalido"
        />,
      );

      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('aria-describedby', 'email-error');
      expect(screen.getByText('Email invalido')).toBeInTheDocument();
      expect(screen.queryByText('Use your work email')).toBeNull();
    });

    it('error state applies border-loss + focus glow tinted red', () => {
      render(<Input id="email" label="Email" error="bad" />);
      const input = screen.getByLabelText('Email');

      expect(input).toHaveClass('border-loss');
      expect(input).toHaveClass('focus:border-loss');
      expect(input).toHaveClass('focus:shadow-[0_0_5px_rgba(255,42,85,0.5)]');
    });
  });

  describe('focus glow', () => {
    it('non-error state applies the jade focus glow classes', () => {
      render(<Input id="email" label="Email" />);
      const input = screen.getByLabelText('Email');

      expect(input).toHaveClass('focus:border-primary');
      expect(input).toHaveClass(
        'focus:shadow-[0_0_5px_rgba(0,255,157,0.5)]',
      );
      expect(input).toHaveClass('focus:outline-none');
    });

    it('base style composes bg-input + border-primary/30 + rounded-lg + text-text-primary + font-body', () => {
      render(<Input id="email" label="Email" />);
      const input = screen.getByLabelText('Email');

      expect(input).toHaveClass('bg-input');
      expect(input).toHaveClass('border');
      expect(input).toHaveClass('border-primary/30');
      expect(input).toHaveClass('rounded-lg');
      expect(input).toHaveClass('px-3');
      expect(input).toHaveClass('py-2');
      expect(input).toHaveClass('text-text-primary');
      expect(input).toHaveClass('font-body');
    });
  });

  describe('disabled', () => {
    it('applies opacity-50 cursor-not-allowed when disabled', () => {
      render(<Input id="email" label="Email" disabled />);
      const input = screen.getByLabelText('Email');

      expect(input).toBeDisabled();
      expect(input).toHaveClass('opacity-50');
      expect(input).toHaveClass('cursor-not-allowed');
    });
  });

  describe('forwardRef', () => {
    it('attaches the forwarded ref to the underlying <input> element', () => {
      const ref = createRef<HTMLInputElement>();
      render(<Input id="email" label="Email" ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current).toBe(screen.getByLabelText('Email'));
    });
  });

  describe('passthrough props', () => {
    it('forwards placeholder + type + autoComplete to the underlying <input>', () => {
      render(
        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="tu@empresa.com"
          autoComplete="email"
        />,
      );
      const input = screen.getByLabelText('Email');

      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveAttribute('placeholder', 'tu@empresa.com');
      expect(input).toHaveAttribute('autocomplete', 'email');
    });
  });
});