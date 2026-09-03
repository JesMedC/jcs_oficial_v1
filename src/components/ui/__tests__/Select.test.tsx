/*
 * design-system-v1 — Select primitive unit tests (Wave 4a, T4a.3).
 *
 * Pins the native-<select> contract from
 * `specs/primitive-library/spec.md` + `design.md` §4.3:
 *   - native <select> wrapped in a <div> that owns label / hint /
 *     error chrome (same FieldShell pattern as Input)
 *   - chevron SVG (aria-hidden) sits inside the wrapper for visual
 *     affordance; the select itself stays untouched so native
 *     keyboard / mobile picker behaviour is preserved
 *   - all `options` render as <option> children
 *   - `options[].disabled` propagates to <option disabled>
 *   - label / hint / error wiring identical to Input
 *   - onChange fires with the selected value
 *   - focus glow + disabled + forwardRef match Input's contract
 */
import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Select } from '../Select';

const OPTIONS = [
  { value: 'long', label: 'Long' },
  { value: 'short', label: 'Short' },
  { value: 'closed', label: 'Closed', disabled: true },
];

describe('Select', () => {
  describe('options rendering', () => {
    it('renders one <option> per item in the options prop', () => {
      render(<Select id="dir" label="Direccion" options={OPTIONS} />);

      expect(screen.getByRole('option', { name: 'Long' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Short' })).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Closed' }),
      ).toBeInTheDocument();
    });

    it('propagates options[].disabled to the <option disabled> attribute', () => {
      render(<Select id="dir" label="Direccion" options={OPTIONS} />);

      const closed = screen.getByRole('option', { name: 'Closed' });
      const long = screen.getByRole('option', { name: 'Long' });

      expect(closed).toBeDisabled();
      expect(long).not.toBeDisabled();
    });

    it('renders a chevron affordance inside the wrapper', () => {
      const { container } = render(
        <Select id="dir" label="Direccion" options={OPTIONS} />,
      );
      // Chevron SVG is rendered inside the wrapper as an aria-hidden
      // decorative element. We scope the search to the immediate
      // wrapper (the root of the component render output) so we do not
      // pick up unrelated SVGs in the document body.
      const wrapper = container.firstElementChild as HTMLElement;
      const chevron = wrapper.querySelector('svg');

      expect(chevron).not.toBeNull();
      expect(chevron?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('label association', () => {
    it('renders the label and wires htmlFor ↔ id when an id is provided', () => {
      render(<Select id="dir" label="Direccion" options={OPTIONS} />);

      const select = screen.getByLabelText('Direccion');
      expect(select).toHaveAttribute('id', 'dir');
    });
  });

  describe('hint + error', () => {
    it('hint renders + aria-describedby targets the hint id', () => {
      render(
        <Select
          id="dir"
          label="Direccion"
          options={OPTIONS}
          hint="Elegi segun tu sesgo"
        />,
      );

      const select = screen.getByLabelText('Direccion');
      expect(select).toHaveAttribute('aria-describedby', 'dir-hint');
      expect(
        screen.getByText('Elegi segun tu sesgo'),
      ).toBeInTheDocument();
    });

    it('error renders + sets aria-invalid + aria-describedby targets the error id', () => {
      render(
        <Select
          id="dir"
          label="Direccion"
          options={OPTIONS}
          error="Direccion requerida"
        />,
      );

      const select = screen.getByLabelText('Direccion');
      expect(select).toHaveAttribute('aria-invalid', 'true');
      expect(select).toHaveAttribute('aria-describedby', 'dir-error');
      expect(
        screen.getByText('Direccion requerida'),
      ).toBeInTheDocument();
    });
  });

  describe('onChange', () => {
    it('fires onChange with the new value when a different option is selected', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <Select
          id="dir"
          label="Direccion"
          options={OPTIONS}
          onChange={onChange}
        />,
      );

      await user.selectOptions(screen.getByLabelText('Direccion'), 'short');

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0]?.[0]).toBeDefined();
      const event = onChange.mock.calls[0]?.[0] as
        | { target: HTMLSelectElement }
        | undefined;
      expect(event?.target.value).toBe('short');
    });
  });

  describe('focus glow', () => {
    it('non-error state applies the jade focus glow classes', () => {
      render(<Select id="dir" label="Direccion" options={OPTIONS} />);
      const select = screen.getByLabelText('Direccion');

      expect(select).toHaveClass('focus:border-primary');
      expect(select).toHaveClass(
        'focus:shadow-[0_0_5px_rgba(0,255,157,0.5)]',
      );
      expect(select).toHaveClass('focus:outline-none');
    });
  });

  describe('disabled', () => {
    it('applies opacity-50 cursor-not-allowed when disabled', () => {
      render(
        <Select id="dir" label="Direccion" options={OPTIONS} disabled />,
      );
      const select = screen.getByLabelText('Direccion');

      expect(select).toBeDisabled();
      expect(select).toHaveClass('opacity-50');
      expect(select).toHaveClass('cursor-not-allowed');
    });
  });

  describe('forwardRef', () => {
    it('attaches the forwarded ref to the underlying <select> element', () => {
      const ref = createRef<HTMLSelectElement>();
      render(
        <Select id="dir" label="Direccion" options={OPTIONS} ref={ref} />,
      );

      expect(ref.current).toBeInstanceOf(HTMLSelectElement);
      expect(ref.current).toBe(screen.getByLabelText('Direccion'));
    });
  });

  describe('passthrough props', () => {
    it('forwards defaultValue to the underlying <select>', () => {
      render(
        <Select
          id="dir"
          label="Direccion"
          options={OPTIONS}
          defaultValue="short"
        />,
      );
      const select = screen.getByLabelText(
        'Direccion',
      ) as HTMLSelectElement;

      expect(select.value).toBe('short');
    });

    it('forwards value to make the select controlled', () => {
      render(
        <Select
          id="dir"
          label="Direccion"
          options={OPTIONS}
          value="closed"
          onChange={() => {}}
        />,
      );
      const select = screen.getByLabelText(
        'Direccion',
      ) as HTMLSelectElement;

      expect(select.value).toBe('closed');
    });
  });
});