import { useEffect } from 'react';

interface TopNavMobileDrawerProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

const navItems: ReadonlyArray<{ label: string; to: string }> = [
  { label: 'Inicio', to: '/' },
  { label: 'Características', to: '/' },
  { label: 'Precios', to: '/' },
  { label: 'Nosotros', to: '/' },
  { label: 'Demo', to: '/' },
];

export function TopNavMobileDrawer({ open, onClose }: TopNavMobileDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Cerrar menú"
        onClick={onClose}
        className="absolute inset-0 bg-bg/80 backdrop-blur-2xl cursor-default"
      />
      <aside className="absolute right-0 top-0 h-full w-[82%] max-w-sm bg-surface-el/95 border-l border-primary/30 backdrop-blur-2xl p-6 flex flex-col gap-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <span className="font-display uppercase tracking-[0.2em] text-primary text-sm">
            JadeCapitalSuite
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-text-secondary hover:text-primary transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.to}
              onClick={onClose}
              className="font-body text-text-primary hover:text-primary transition-colors py-3 border-b border-primary/10"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex flex-col gap-3 mt-auto">
          <a
            href="/demo"
            onClick={onClose}
            className="inline-flex justify-center border-2 border-primary text-primary font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:bg-primary hover:text-bg transition-colors"
          >
            Solicitar demo
          </a>
          <a
            href="/login"
            onClick={onClose}
            className="inline-flex justify-center bg-primary text-bg font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:shadow-[0_0_24px_rgba(0,255,255,0.5)] transition-shadow"
          >
            Iniciar sesión
          </a>
        </div>
      </aside>
    </div>
  );
}
