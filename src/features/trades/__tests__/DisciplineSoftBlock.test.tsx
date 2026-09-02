/*
 * FASE 4A / Ola 6 — DisciplineSoftBlock tests.
 *
 * Locks the four contracts the soft-block promises:
 *
 *   1. Hidden when the journal is filled (pre_trade_notes non-empty
 *      OR emotionalTagsCount > 0).
 *   2. Visible when the journal is empty (banner in the DOM).
 *   3. "Guardar igual" → onConfirmSkip fires; the user always has a
 *      way out (the block is soft, not hard).
 *   4. "Agregar nota" → onRequestFocusNotes fires; the parent
 *      decides what to do (typically focus the notes textarea).
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { DisciplineSoftBlock } from '../DisciplineSoftBlock';

describe('DisciplineSoftBlock', () => {
  it('no renderiza si el journal esta completo (notas + tags)', () => {
    const { container } = render(
      <DisciplineSoftBlock
        preTradeNotes="Tengo plan"
        emotionalTagsCount={2}
        onConfirmSkip={() => undefined}
        onRequestFocusNotes={() => undefined}
      />,
    );
    expect(container.querySelector('[data-testid="discipline-soft-block"]')).toBeNull();
  });

  it('no renderiza si solo hay notas (sin tags)', () => {
    const { container } = render(
      <DisciplineSoftBlock
        preTradeNotes="Esperando setup"
        emotionalTagsCount={0}
        onConfirmSkip={() => undefined}
        onRequestFocusNotes={() => undefined}
      />,
    );
    expect(container.querySelector('[data-testid="discipline-soft-block"]')).toBeNull();
  });

  it('renderiza el banner amarillo si journal vacio', () => {
    render(
      <DisciplineSoftBlock
        preTradeNotes=""
        emotionalTagsCount={0}
        onConfirmSkip={() => undefined}
        onRequestFocusNotes={() => undefined}
      />,
    );
    expect(screen.getByTestId('discipline-soft-block')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('click "Guardar igual" llama onConfirmSkip', () => {
    const onConfirmSkip = vi.fn();
    render(
      <DisciplineSoftBlock
        preTradeNotes=""
        emotionalTagsCount={0}
        onConfirmSkip={onConfirmSkip}
        onRequestFocusNotes={() => undefined}
      />,
    );
    fireEvent.click(screen.getByTestId('soft-block-skip'));
    expect(onConfirmSkip).toHaveBeenCalledTimes(1);
  });

  it('click "Agregar nota" llama onRequestFocusNotes', () => {
    const onRequestFocusNotes = vi.fn();
    render(
      <DisciplineSoftBlock
        preTradeNotes=""
        emotionalTagsCount={0}
        onConfirmSkip={() => undefined}
        onRequestFocusNotes={onRequestFocusNotes}
      />,
    );
    fireEvent.click(screen.getByTestId('soft-block-add-notes'));
    expect(onRequestFocusNotes).toHaveBeenCalledTimes(1);
  });
});
