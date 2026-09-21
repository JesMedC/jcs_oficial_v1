/*
 * portal-fase0a-base — NewTradeButton.
 *
 * Jade-filled "+ Nuevo Trade" CTA in the topbar. Glows softly to
 * invite a click without screaming. Opens the right-side
 * NewTradeDrawer (src/features/trades/NewTradeDrawer.tsx) via the
 * useNewTradeDrawer store.
 *
 * Per the brand refresh, the button uses glow-primary utility so the
 * visual stays consistent with other jade highlights in the chrome.
 */
import { useCallback } from 'react';

import { useNewTradeDrawer } from '../../stores/useNewTradeDrawer';

export function NewTradeButton() {
  const open = useNewTradeDrawer((state) => state.open);

  const onClick = useCallback(() => {
    open();
  }, [open]);

  return (
    <button
      type="button"
      data-testid="new-trade-button"
      onClick={onClick}
      data-glow-primary
      className="btn-cyber-jade inline-flex items-center gap-1.5 px-2.5 py-1 md:px-4 md:py-1.5 rounded-md md:rounded-lg text-xs md:text-sm"
      aria-label="Abrir formulario de nuevo trade"
    >
      <span aria-hidden="true">+</span>
      <span>Nuevo Trade</span>
    </button>
  );
}
