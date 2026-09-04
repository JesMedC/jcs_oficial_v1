/*
 * one-by-one-thousand-discipline (PR-2) — InterestChips tests.
 *
 * Locks the single-select chip contract (REQ-INT-002/003):
 *
 *   1. Renders exactly the keys of `INTEREST_LABEL`.
 *   2. `data-active` mirrors the selected value (single, not array).
 *   3. Clicking a chip selects it; clicking the active chip clears
 *      it (reversible control without a separate "Clear" button).
 *   4. `onChange` is fired once per click with the next key OR
 *      ``null`` (clear).
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { InterestChips } from '../InterestChips';
import { INTEREST_LABEL, type Interest } from '../types';

describe('InterestChips', () => {
  it('renderiza un chip por cada key de INTEREST_LABEL', () => {
    render(<InterestChips value={null} onChange={() => undefined} />);
    // Exclude the container (`interest-chips`) — match only leaf
    // chip buttons (`interest-<KEY>` where KEY is non-empty).
    const chips = screen.getAllByTestId(/^interest-[A-Z]/);
    expect(chips.length).toBe(Object.keys(INTEREST_LABEL).length);
  });

  it('marca data-active=true solo para el valor seleccionado', () => {
    render(
      <InterestChips value={'PLAN' as Interest} onChange={() => undefined} />,
    );
    expect(screen.getByTestId('interest-PLAN')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('interest-FOMO')).toHaveAttribute('data-active', 'false');
    expect(screen.getByTestId('interest-REVENGE')).toHaveAttribute('data-active', 'false');
    expect(screen.getByTestId('interest-IMPULSE')).toHaveAttribute('data-active', 'false');
  });

  it('click en chip no presente lo emite como onChange', () => {
    const onChange = vi.fn();
    render(<InterestChips value={null} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('interest-FOMO'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('FOMO');
  });

  it('click en chip activo lo limpia (onChange con null)', () => {
    const onChange = vi.fn();
    render(
      <InterestChips value={'PLAN' as Interest} onChange={onChange} />,
    );
    fireEvent.click(screen.getByTestId('interest-PLAN'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('click cambia entre chips sin necesidad de limpiar primero', () => {
    const onChange = vi.fn();
    render(
      <InterestChips value={'FOMO' as Interest} onChange={onChange} />,
    );
    fireEvent.click(screen.getByTestId('interest-REVENGE'));
    expect(onChange).toHaveBeenCalledWith('REVENGE');
  });

  it('usa los labels en español del INTEREST_LABEL', () => {
    render(<InterestChips value={null} onChange={() => undefined} />);
    expect(screen.getByTestId('interest-PLAN')).toHaveTextContent('Plan');
    expect(screen.getByTestId('interest-IMPULSE')).toHaveTextContent('Impulso');
    expect(screen.getByTestId('interest-REVENGE')).toHaveTextContent('Venganza');
  });
});