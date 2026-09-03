/*
 * portal-fase0a-base — CommandPaletteTrigger.
 *
 * Small button that mirrors the chrome-style of the topbar and reads
 * "Buscar · ⌘K" on macOS profiles / "Buscar · Ctrl+K" elsewhere.
 * For the FASE 0A wiring we use Ctrl+K for non-mac display; the
 * underlying hotkey listener (useCommandPaletteHotkey, Wave 6) does
 * the proper platform split.
 *
 * Click also opens the palette via useCommandPalette.open() so users
 * without a keyboard (or on a touch device) can still trigger it.
 */
import { useCallback } from 'react';

import { useCommandPalette } from '../../stores/useCommandPalette';

export function CommandPaletteTrigger() {
  const open = useCommandPalette((state) => state.open);

  const onClick = useCallback(() => {
    open();
  }, [open]);

  return (
    <button
      type="button"
      data-testid="command-palette-trigger"
      onClick={onClick}
      className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[rgba(0,255,157,0.30)] bg-transparent text-text-secondary font-body text-xs hover:border-primary hover:text-primary transition-colors"
      aria-label="Abrir paleta de comandos"
    >
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
      </svg>
      <span>Buscar</span>
      <kbd className="font-display uppercase tracking-wide text-[10px] text-text-muted border border-[rgba(0,255,157,0.30)] px-1.5 py-0.5 rounded">
        Ctrl+K
      </kbd>
    </button>
  );
}
