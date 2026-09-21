/*
 * portal-fase0a-base — store: useNewTradeDrawer.
 *
 * Ephemeral flag that says whether the "+ Nuevo Trade" right-side
 * drawer (src/features/trades/NewTradeDrawer.tsx) is mounted/open,
 * plus an optional prefill payload used by external consumers that
 * want to seed the form with a specific pair + direction (the
 * Market Analyzer Bot alerts trigger this from the new Scanner
 * page).
 *
 * Bound by:
 *   - <NewTradeButton /> in TopNav (top-bar trigger)
 *   - `trade.new` action in the command palette
 *   - `<ScannerAlertCard />` "Cargar en Diario" CTA
 *
 * Drawer itself consumes `open()` / `close()` from this store; it does
 * NOT own visibility, so other consumers can wire into the same store
 * without prop-drilling through TopNav.
 *
 * `prefill` is intentionally a separate slice — a stale prefill
 * after the user closes the drawer would otherwise overwrite a
 * later manual "Nuevo trade" click. `openWithPrefill(prefill)` sets
 * both the visibility and the payload in one shot so the drawer
 * form can read them atomically.
 *
 * State is local-only; the drawer is intentionally not persisted
 * across reloads (a half-typed trade form is worse than re-opening
 * cleanly with a fresh form).
 */
import { create } from 'zustand';

/**
 * Pre-fill payload accepted by ``openWithPrefill``. Fields map 1:1
 * to the NewTradeForm's defaultValues so the form can pick them up
 * via the existing ``useEffect`` sync hook without any new form
 * fields. ``investment_usd`` is a STRING here (the form stores it
 * as a string-typed input — the discipline engine re-coerces it
 * anyway).
 */
export interface NewTradePrefill {
  readonly pair: string;
  readonly direction: 'PUT' | 'CALL';
  readonly investment_usd?: string;
}

interface NewTradeDrawerState {
  readonly isOpen: boolean;
  /** Optional payload that seeds NewTradeForm when the drawer mounts. */
  readonly prefill: NewTradePrefill | null;
  readonly open: () => void;
  readonly close: () => void;
  readonly toggle: () => void;
  /** Open the drawer AND seed the form with ``prefill``. */
  readonly openWithPrefill: (prefill: NewTradePrefill) => void;
}

export const useNewTradeDrawer = create<NewTradeDrawerState>((set) => ({
  isOpen: false,
  prefill: null,
  open: () => {
    set({ isOpen: true });
  },
  close: () => {
    // Also drop the prefill on close so a later manual "Nuevo
    // trade" doesn't reopen with the previous scanner pair seeded.
    set({ isOpen: false, prefill: null });
  },
  toggle: () => {
    set((state) => ({ isOpen: !state.isOpen }));
  },
  openWithPrefill: (prefill) => {
    set({ isOpen: true, prefill });
  },
}));
