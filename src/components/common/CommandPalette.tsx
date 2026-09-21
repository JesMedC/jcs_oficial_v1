/*
 * portal-fase0a-base — CommandPalette.
 *
 * Wrapper around cmdk (`npm i cmdk`) that:
 *   - reads `isOpen` from useCommandPalette so the host doesn't have
 *     to pass props
 *   - lazy-rendered at the application root (TopNav hosts it) so the
 *     initial bundle doesn't pay for a feature most users don't use
 *   - dispatches COMMAND_ACTIONS through a small adapter so tests can
 *     assert the side effects without spinning up the router
 *
 * cmdk supplies ↑/↓/Enter/Esc out of the box; we layer on a custom
 * jade border + glass background so the look matches the rest of the
 * portal chrome.
 */
import { useEffect, useMemo } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';
import { useNewTradeDrawer } from '../../stores/useNewTradeDrawer';
import { useCommandPalette } from '../../stores/useCommandPalette';
import { COMMAND_ACTIONS, type CommandAction } from './commandActions';

export interface CommandPaletteProps {
  /** Override the default empty-state label. */
  readonly emptyMessage?: string;
}

export function CommandPalette({ emptyMessage = 'Sin resultados' }: CommandPaletteProps) {
  const isOpen = useCommandPalette((state) => state.isOpen);
  const close = useCommandPalette((state) => state.close);
  const openTradeDrawer = useNewTradeDrawer((state) => state.open);
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Build the dispatch adapter once per render so action `run()`s stay
  // stable for jest/Vitest snapshots (the closures themselves change
  // each render, but the call shape doesn't).
  const api = useMemo(
    () => ({
      navigate,
      openTradeDrawer,
      logout: () => {
        void logout().catch(() => {
          /* best-effort */
        });
      },
    }),
    [navigate, openTradeDrawer, logout],
  );

  // Close on Escape (cmdk handles this by default; we just make sure
  // the store flips back to closed when the user dismisses).
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div
      data-testid="command-palette-root"
      className="fixed inset-0 z-[60] bg-black/60 flex items-start justify-center pt-24"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <div className="w-full max-w-lg bg-surface-el/80 backdrop-blur-glass-lg border border-primary/30 rounded-glass-lg shadow-elevated overflow-hidden">
        <Command label="Paleta de comandos" className="text-text-primary">
          <Command.Input
            placeholder="Busca una accion o ruta..."
            className="w-full px-4 py-3 bg-transparent border-b border-primary/20 font-body text-base text-text-primary placeholder:text-text-muted outline-none"
            data-testid="command-palette-input"
          />
          <Command.List
            className="max-h-80 overflow-y-auto py-2"
            data-testid="command-palette-list"
          >
            <Command.Empty className="px-4 py-6 text-center text-text-muted font-body text-sm">
              {emptyMessage}
            </Command.Empty>
            {(['navigation', 'actions'] as const).map((group) => (
              <Command.Group
                key={group}
                heading={group === 'navigation' ? 'Navegacion' : 'Acciones'}
                className="px-2 py-1"
              >
                {COMMAND_ACTIONS.filter((a: CommandAction) => a.group === group).map((action) => (
                  <Command.Item
                    key={action.id}
                    value={action.label}
                    data-testid={`command-palette-item-${action.id}`}
                    onSelect={() => {
                      action.run(api);
                      close();
                    }}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg font-body text-sm text-text-secondary cursor-pointer data-[selected=true]:bg-primary/15 data-[selected=true]:text-primary aria-selected:bg-primary/15 aria-selected:text-primary"
                  >
                    <span className="truncate">{action.label}</span>
                    {action.shortcut !== undefined ? (
                      <kbd className="font-display uppercase tracking-wide text-[10px] text-text-muted border border-primary/20 px-1.5 py-0.5 rounded">
                        {action.shortcut}
                      </kbd>
                    ) : null}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
