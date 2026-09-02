/*
 * portal-fase0a-base — global hotkey listener tests.
 *
 * Validates that cmd/ctrl + 'k' opens the palette and that typing
 * inside an <input> is NOT intercepted (the user must be able to type
 * 'k' inside a form field).
 */
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useCommandPaletteHotkey } from '../useCommandPaletteHotkey';
import { useCommandPalette } from '../../stores/useCommandPalette';

function dispatchKey(key: string, opts: Partial<KeyboardEventInit> = {}) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, ...opts }));
}

describe('useCommandPaletteHotkey', () => {
  it('cmd+k opens the palette', () => {
    useCommandPalette.setState({ isOpen: false });
    renderHook(() => useCommandPaletteHotkey());
    dispatchKey('k', { metaKey: true });
    expect(useCommandPalette.getState().isOpen).toBe(true);
  });

  it('ctrl+k opens the palette (Linux/Windows parity)', () => {
    useCommandPalette.setState({ isOpen: false });
    renderHook(() => useCommandPaletteHotkey());
    dispatchKey('k', { ctrlKey: true });
    expect(useCommandPalette.getState().isOpen).toBe(true);
  });

  it('does NOT open the palette when typing inside an input', () => {
    useCommandPalette.setState({ isOpen: false });
    renderHook(() => useCommandPaletteHotkey());
    const input = document.createElement('input');
    document.body.appendChild(input);
    const evt = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
    input.dispatchEvent(evt);
    document.body.removeChild(input);
    expect(useCommandPalette.getState().isOpen).toBe(false);
  });

  it('does NOT open the palette for non-k keys', () => {
    useCommandPalette.setState({ isOpen: false });
    renderHook(() => useCommandPaletteHotkey());
    dispatchKey('j', { metaKey: true });
    dispatchKey('k');
    expect(useCommandPalette.getState().isOpen).toBe(false);
    void vi; // keep vitest import for the runner
  });
});
