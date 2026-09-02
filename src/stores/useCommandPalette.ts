/*
 * portal-fase0a-base — store: useCommandPalette.
 *
 * Ephemeral flag that says whether the Cmd+K / Ctrl+K command
 * palette (src/components/common/CommandPalette.tsx) is mounted.
 * Bound by:
 *   - <CommandPaletteTrigger /> in TopNav
 *   - `useCommandPaletteHotkey` global keydown listener
 *   - action dispatchers inside the palette (Escape / Enter navigate)
 *
 * Not persisted; the palette is a transient lookup surface.
 */
import { create } from 'zustand';

interface CommandPaletteState {
  readonly isOpen: boolean;
  readonly open: () => void;
  readonly close: () => void;
  readonly toggle: () => void;
}

export const useCommandPalette = create<CommandPaletteState>((set) => ({
  isOpen: false,
  open: () => {
    set({ isOpen: true });
  },
  close: () => {
    set({ isOpen: false });
  },
  toggle: () => {
    set((state) => ({ isOpen: !state.isOpen }));
  },
}));
