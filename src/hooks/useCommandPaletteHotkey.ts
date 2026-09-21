/*
 * portal-fase0a-base — global keydown listener for the command palette.
 *
 * Wires the (metaKey || ctrlKey) && key === 'k' shortcut to
 * useCommandPalette.open(). Ignores events where the focus is inside
 * an input / textarea / contenteditable so the user can still type
 * 'k' in their own form fields without the palette hijacking the page.
 *
 * Platform split: the cmd-key combo is what users on macOS expect; on
 * Linux/Windows the same shortcut is ctrlKey+k. We accept both for
 * cross-platform parity.
 */
import { useEffect } from 'react';

import { useCommandPalette } from '../stores/useCommandPalette';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useCommandPaletteHotkey(): void {
  const open = useCommandPalette((state) => state.open);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        if (isEditableTarget(event.target)) return;
        event.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);
}
