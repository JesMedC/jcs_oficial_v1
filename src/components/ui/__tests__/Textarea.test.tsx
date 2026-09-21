/*
 * design-system-v1 — Textarea primitive unit tests (Wave 4a, T4a.4).
 *
 * Pins the multi-line text control contract from
 * `specs/primitive-library/spec.md` + `design.md` §4.4:
 *   - native <textarea> wrapped in the same label / hint / error
 *     chrome as Input (auto-id via useId, htmlFor ↔ id wiring,
 *     aria-invalid + aria-describedby)
 *   - base style identical to Input (bg-input + border-primary/30
 *     + rounded-lg + px-3 py-2 + text-text-primary + font-body)
 *   - focus glow: jade ring via
 *     `focus:border-primary focus:shadow-[0_0_5px_rgba(0,255,157,0.5)]
 *     focus:outline-none`
 *   - error state: `border-loss` + red focus glow
 *   - disabled: `opacity-50 cursor-not-allowed`
 *   - `resize-y` for vertical-only resize handle
 *   - `rows` prop defaults to 4 when caller omits it; the `rows`
 *     attribute is applied to the underlying <textarea>
 *   - forwardRef so React Hook Form's `register('fieldName')` can
 *     target the textarea element
 */
import { describe, expect, it } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';

import { Textarea } from '../Textarea';

describe('Textarea', () => {
  describe('label association', () => {
    it('renders the label and wires htmlFor ↔ id when an id is provided', () => {
      render(<Textarea id="notes" label="Notas" />);

      const textarea = screen.getByLabelText('Notas');
      expect(textarea).toHaveAttribute('id', 'notes');
    });

    it('auto-generates an id when none is provided and still wires htmlFor ↔ id', () => {
      render(<Textarea label="Notas" />);

      const textarea = screen.getByLabelText('Notas');
      expect(textarea.getAttribute('id')).not.toBe('');
    });
  });

  describe('rows attribute', () => {
    it('defaults to rows=4 when no rows prop is provided', () => {
      render(<Textarea id="notes" label="Notas" />);

      const textarea = screen.getByLabelText('Notas');
      expect(textarea).toHaveAttribute('rows', '4');
    });

    it('forwards a custom rows value to the underlying <textarea>', () => {
      render(<Textarea id="notes" label="Notas" rows={8} />);

      const textarea = screen.getByLabelText('Notas');
      expect(textarea).toHaveAttribute('rows', '8');
    });
  });

  describe('hint + error', () => {
    it('hint renders + aria-describedby targets the hint id', () => {
      render(
        <Textarea
          id="notes"
          label="Notas"
          hint="Opcional, hasta 500 caracteres"
        />,
      );

      const textarea = screen.getByLabelText('Notas');
      expect(textarea).toHaveAttribute('aria-describedby', 'notes-hint');
      expect(
        screen.getByText('Opcional, hasta 500 caracteres'),
      ).toBeInTheDocument();
    });

    it('error renders + sets aria-invalid + aria-describedby targets the error id', () => {
      render(
        <Textarea
          id="notes"
          label="Notas"
          error="Demasiado largo"
        />,
      );

      const textarea = screen.getByLabelText('Notas');
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
      expect(textarea).toHaveAttribute('aria-describedby', 'notes-error');
      expect(screen.getByText('Demasiado largo')).toBeInTheDocument();
    });

    it('error state applies border-loss + red focus glow', () => {
      render(<Textarea id="notes" label="Notas" error="bad" />);
      const textarea = screen.getByLabelText('Notas');

      expect(textarea).toHaveClass('border-loss');
      expect(textarea).toHaveClass('focus:border-loss');
      expect(textarea).toHaveClass('focus:shadow-[0_0_5px_rgba(255,42,85,0.5)]');
    });
  });

  describe('focus glow', () => {
    it('non-error state applies the jade focus glow classes', () => {
      render(<Textarea id="notes" label="Notas" />);
      const textarea = screen.getByLabelText('Notas');

      expect(textarea).toHaveClass('focus:border-primary');
      expect(textarea).toHaveClass(
        'focus:shadow-[0_0_5px_rgba(0,255,157,0.5)]',
      );
      expect(textarea).toHaveClass('focus:outline-none');
    });

    it('base style composes bg-input + border-primary/30 + rounded-lg + text-text-primary + font-body', () => {
      render(<Textarea id="notes" label="Notas" />);
      const textarea = screen.getByLabelText('Notas');

      expect(textarea).toHaveClass('bg-input');
      expect(textarea).toHaveClass('border');
      expect(textarea).toHaveClass('border-primary/30');
      expect(textarea).toHaveClass('rounded-lg');
      expect(textarea).toHaveClass('px-3');
      expect(textarea).toHaveClass('py-2');
      expect(textarea).toHaveClass('text-text-primary');
      expect(textarea).toHaveClass('font-body');
    });
  });

  describe('resize handle', () => {
    it('applies resize-y so only vertical resize is allowed', () => {
      render(<Textarea id="notes" label="Notas" />);
      const textarea = screen.getByLabelText('Notas');

      expect(textarea).toHaveClass('resize-y');
    });
  });

  describe('disabled', () => {
    it('applies opacity-50 cursor-not-allowed when disabled', () => {
      render(<Textarea id="notes" label="Notas" disabled />);
      const textarea = screen.getByLabelText('Notas');

      expect(textarea).toBeDisabled();
      expect(textarea).toHaveClass('opacity-50');
      expect(textarea).toHaveClass('cursor-not-allowed');
    });
  });

  describe('forwardRef', () => {
    it('attaches the forwarded ref to the underlying <textarea> element', () => {
      const ref = createRef<HTMLTextAreaElement>();
      render(<Textarea id="notes" label="Notas" ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
      expect(ref.current).toBe(screen.getByLabelText('Notas'));
    });
  });

  describe('passthrough props', () => {
    it('forwards placeholder + maxLength to the underlying <textarea>', () => {
      render(
        <Textarea
          id="notes"
          label="Notas"
          placeholder="Escribi tus notas"
          maxLength={500}
        />,
      );
      const textarea = screen.getByLabelText('Notas');

      expect(textarea).toHaveAttribute('placeholder', 'Escribi tus notas');
      expect(textarea).toHaveAttribute('maxlength', '500');
    });
  });
});