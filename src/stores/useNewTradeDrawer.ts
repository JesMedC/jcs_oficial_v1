/*
 * portal-fase0a-base — store: useNewTradeDrawer.
 *
 * Ephemeral flag that says whether the "+ Nuevo Trade" right-side
 * drawer (src/features/trades/NewTradeDrawer.tsx) is mounted/open.
 * Bound by:
 *   - <NewTradeButton /> in TopNav (top-bar trigger)
 *   - `trade.new` action in the command palette
 *
 * Drawer itself consumes `open()` / `close()` from this store; it does
 * NOT own visibility, so other consumers can wire into the same store
 * without prop-drilling through TopNav.
 *
 * State is local-only; the drawer is intentionally not persisted
 * across reloads (a half-typed trade form is worse than re-opening
 * cleanly with a fresh form).
 */
import { create } from 'zustand';

interface NewTradeDrawerState {
  readonly isOpen: boolean;
  readonly open: () => void;
  readonly close: () => void;
  readonly toggle: () => void;
}

export const useNewTradeDrawer = create<NewTradeDrawerState>((set) => ({
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
