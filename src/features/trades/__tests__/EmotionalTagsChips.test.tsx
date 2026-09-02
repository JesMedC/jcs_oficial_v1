/*
 * FASE 4A / Ola 6 — EmotionalTagsChips tests.
 *
 * Locks three contracts the chip selector promises:
 *
 *   1. Renders exactly the keys of `EMOTIONAL_TAG_LABEL` (so adding a
 *      new tag to the enum + label map automatically surfaces it).
 *   2. `data-active` mirrors `value.includes(key)` so the active state
 *      is observable from tests and CSS without parsing classNames.
 *   3. Clicking a chip toggles its presence in the `value` array via
 *      `onChange` — single source of truth, no internal state.
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { EmotionalTagsChips } from '../EmotionalTagsChips';
import { EMOTIONAL_TAG_LABEL, type EmotionalTag } from '../types';

describe('EmotionalTagsChips', () => {
  it('renderiza un chip por cada key de EMOTIONAL_TAG_LABEL', () => {
    render(<EmotionalTagsChips value={[]} onChange={() => undefined} />);
    const chips = screen.getAllByTestId(/^emotional-tag-/);
    expect(chips.length).toBe(Object.keys(EMOTIONAL_TAG_LABEL).length);
  });

  it('marca data-active=true para los tags en value', () => {
    render(
      <EmotionalTagsChips
        value={['FOMO', 'DISCIPLINE'] as EmotionalTag[]}
        onChange={() => undefined}
      />,
    );
    expect(screen.getByTestId('emotional-tag-FOMO')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('emotional-tag-DISCIPLINE')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('emotional-tag-REVENGE')).toHaveAttribute('data-active', 'false');
  });

  it('toggle: click en chip no presente lo agrega al onChange', () => {
    const onChange = vi.fn();
    render(<EmotionalTagsChips value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('emotional-tag-FOMO'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(['FOMO']);
  });

  it('toggle: click en chip presente lo quita del onChange', () => {
    const onChange = vi.fn();
    render(
      <EmotionalTagsChips
        value={['FOMO', 'REVENGE'] as EmotionalTag[]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTestId('emotional-tag-FOMO'));
    expect(onChange).toHaveBeenCalledWith(['REVENGE']);
  });

  it('muestra el label en español del EMOTIONAL_TAG_LABEL', () => {
    render(<EmotionalTagsChips value={[]} onChange={() => undefined} />);
    // FOMO se queda igual, pero los otros tags sí tienen label custom.
    expect(screen.getByTestId('emotional-tag-REVENGE')).toHaveTextContent('Venganza');
    expect(screen.getByTestId('emotional-tag-DISCIPLINE')).toHaveTextContent('Disciplina');
  });
});
