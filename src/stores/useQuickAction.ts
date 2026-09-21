/*
 * portal-fase0a-base — store: useQuickAction.
 *
 * Cross-page dispatch for the four "quick action" shortcuts surfaced
 * through the FloatingActionButton:
 *
 *   - openNewTrade()  → opens NewTradeDrawer (existing store)
 *   - openFund()      → signal "open the fund modal" (consumed by
 *                       CuentasPage; default = first active account)
 *   - openWithdraw()  → signal "open the withdraw modal" (consumed
 *                       by CuentasPage; default = first active account)
 *   - openNewAccount()→ signal "scroll to / focus the create-account
 *                       form" (consumed by CuentasPage)
 *
 * Each `request*` is a one-shot ticket: the page that handles it
 * sets `pending* = null` after consuming. This way the user can fire
 * the same shortcut twice in a row without needing a different key.
 *
 * Kept separate from `useNewTradeDrawer` because that store already
 * owns the trade flow and we don't want to mix concerns; the FAB
 * simply forwards into the existing store on `openNewTrade`.
 */
import { create } from 'zustand';

export type QuickAction = 'fund' | 'withdraw' | 'newAccount';

interface QuickActionState {
  readonly pending: QuickAction | null;
  readonly request: (action: QuickAction) => void;
  readonly consume: () => void;
}

export const useQuickAction = create<QuickActionState>((set) => ({
  pending: null,
  request: (action) => set({ pending: action }),
  consume: () => set({ pending: null }),
}));
