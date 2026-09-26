import type { ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TopNav } from './TopNav';
import { Footer } from './Footer';
import { CookiesConsent } from '../components/consent/CookiesConsent';
import { NeuralMesh } from '../components/decor/NeuralMesh';

interface AppShellProps {
  readonly children?: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  // Authenticated workspaces own their navigation and status chrome. Public
  // marketing routes keep the conversion-oriented header and footer.
  const location = useLocation();
  const isWorkspace =
    location.pathname.startsWith('/portal') || location.pathname.startsWith('/admin');

  return (
    /*
     * Cyber-Jade spec — fondo global #060B10. El fondo decorativo
     * NeuralMesh muestra una red densa de nodos jade con glow, en
     * 3 tiers (fondo / medio / foreground) para dar profundidad.
     * fixed inset-0 + z-0 + pointer-events-none para que se vea
     * siempre detrás del contenido sin importar el scroll.
     */
    <div className="relative min-h-dvh flex flex-col bg-[#060B10] text-text-primary">
      <NeuralMesh />
      {isWorkspace ? null : <TopNav />}
      <main className="flex-1">{children ?? <Outlet />}</main>
      {isWorkspace ? null : <Footer />}
      {/*
       * CookiesConsent is rendered last so its `z-50` overlay sits above
       * TopNav (`z-40`) and the page content. It unmounts itself once the
       * user clicks a button, so subsequent visits don't show the dialog.
       */}
      <CookiesConsent />
    </div>
  );
}
