/*
 * Cyber-Jade — FloatingActionButton.
 *
 * Persistent FAB anchored bottom-right on every authenticated portal
 * route. Single circular trigger with a "+"; on tap it fans out into
 * a vertical menu with the four shortcuts the user needs to take
 * fast action:
 *
 *   - + Nuevo trade
 *   - + Depósito
 *   - + Retiro
 *   - + Nueva cuenta
 *
 * Backdrop dismiss + click-outside close. Each item fans out with a
 * short stagger so the menu reads as a stack, not a list. Colors stay
 * in the Cyber-Jade palette (jade stroke, jade glow on hover/active).
 *
 * Position: fixed bottom-right, well above the sidebar footer (the
 * sidebar runs along the left edge, so the FAB never collides with
 * workspace info or the new logout button).
 *
 * Mounted at portal-shell level (PortalShell) so it persists across
 * every /portal/* page without each page having to import it.
 */
import { useEffect, useRef, useState } from 'react';

import { useNewTradeDrawer } from '../../stores/useNewTradeDrawer';
import { useQuickAction } from '../../stores/useQuickAction';

interface MenuItem {
  readonly id: 'newTrade' | 'fund' | 'withdraw' | 'newAccount';
  readonly label: string;
  readonly hint: string;
}

const MENU: ReadonlyArray<MenuItem> = [
  { id: 'newTrade', label: 'Nuevo trade', hint: 'Abre el formulario de operacion' },
  { id: 'fund', label: 'Deposito', hint: 'Suma saldo a la cuenta activa' },
  { id: 'withdraw', label: 'Retiro', hint: 'Retira saldo de la cuenta activa' },
  { id: 'newAccount', label: 'Nueva cuenta', hint: 'Ir al formulario de cuenta' },
];

export function FloatingActionButton() {
  const [open, setOpen] = useState(false);
  const openTradeDrawer = useNewTradeDrawer((s) => s.open);
  const requestQuick = useQuickAction((s) => s.request);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Click outside / Escape close.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleSelect = (id: MenuItem['id']) => {
    setOpen(false);
    switch (id) {
      case 'newTrade':
        // The drawer is mounted at PortalShell level, so calling
        // open() here works from any /portal/* page.
        openTradeDrawer();
        break;
      case 'fund':
        // QuickActionModals is mounted at PortalShell level. It
        // opens its own dialog with an account picker — no need
        // to navigate anywhere.
        requestQuick('fund');
        break;
      case 'withdraw':
        requestQuick('withdraw');
        break;
      case 'newAccount':
        // QuickActionModals opens the fast create-account dialog.
        requestQuick('newAccount');
        break;
    }
  };

  return (
    <div
      ref={wrapperRef}
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 select-none"
      data-testid="portal-fab"
    >
      {/* Backdrop scrim when the menu is open. We render it on top of
          everything except the menu itself so the user can click
          anywhere outside to close. */}
      {open ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 -z-10 bg-[#060B10]/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      ) : null}

      {/* Menu items, animated. We render them in reverse so the
          bottom item (closest to the trigger) appears first. */}
      <div
        className={[
          'flex flex-col gap-2 items-end transition-all duration-200 origin-bottom-right',
          open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none',
        ].join(' ')}
        aria-hidden={!open}
      >
        {MENU.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            data-testid={`fab-item-${item.id}`}
            onClick={() => handleSelect(item.id)}
            style={{ transitionDelay: open ? `${idx * 30}ms` : '0ms' }}
            className={[
              'group flex items-center gap-3',
              'bg-[rgba(13,21,30,0.92)] backdrop-blur-md',
              'border border-[rgba(0,255,157,0.45)] rounded-full',
              'px-4 py-2 shadow-[0_0_18px_rgba(0,255,157,0.25)]',
              'hover:border-[#00FF9D] hover:shadow-[0_0_22px_rgba(0,255,157,0.55)]',
              'transition-all',
            ].join(' ')}
          >
            <span
              className={[
                'inline-flex w-7 h-7 items-center justify-center rounded-full',
                'bg-[rgba(0,255,157,0.12)] text-[#00FF9D] font-display text-base',
                'group-hover:bg-[rgba(0,255,157,0.22)] transition-colors',
              ].join(' ')}
              aria-hidden="true"
            >
              +
            </span>
            <span className="font-display uppercase tracking-wider text-xs text-white">
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* The trigger button — circular jade with strong glow. */}
      <button
        type="button"
        data-testid="fab-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Cerrar menu de acciones rapidas' : 'Abrir menu de acciones rapidas'}
        aria-expanded={open}
        className={[
          'inline-flex items-center justify-center',
          'w-14 h-14 md:w-16 md:h-16 rounded-full',
          'bg-transparent border-2 border-[#00FF9D]',
          'text-[#00FF9D] font-display text-2xl md:text-3xl leading-none',
          'shadow-[0_0_20px_rgba(0,255,157,0.5),inset_0_0_12px_rgba(0,255,157,0.25)]',
          '[text-shadow:0_0_8px_rgba(0,255,157,0.7)]',
          'hover:bg-[#00FF9D] hover:text-[#060B10]',
          'hover:shadow-[0_0_30px_rgba(0,255,157,0.85),inset_0_0_16px_rgba(0,255,157,0.45)]',
          'transition-all duration-200',
        ].join(' ')}
      >
        <span aria-hidden="true" className={open ? 'rotate-45 transition-transform duration-200' : 'transition-transform duration-200'}>
          +
        </span>
      </button>
    </div>
  );
}
