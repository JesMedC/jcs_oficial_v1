import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { AuroraBackground } from './AuroraBackground';
import { TopNav } from './TopNav';
import { Footer } from './Footer';
import { CookiesConsent } from '../components/consent/CookiesConsent';
import { DotGrid } from '../components/decor/DotGrid';

interface AppShellProps {
  readonly children?: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    // design-system-v1 (Wave 6, T6.4) — added `relative` so the
    // <DotGrid> mounted below has a positioning ancestor (DotGrid
    // uses `absolute inset-0` to fill its parent). The DotGrid is
    // pinned at the deepest decorative layer, behind AuroraBackground
    // (which is `fixed inset-0` and renders the aurora-static
    // gradient). Both are `-z-10 pointer-events-none` so neither
    // intercepts clicks; the visible ordering on screen is DotGrid
    // (lowest) → AuroraBackground → content (TopNav, Outlet, Footer).
    <div className="relative min-h-dvh flex flex-col bg-bg text-text-primary">
      <DotGrid opacity={0.04} />
      <AuroraBackground />
      <TopNav />
      <main className="flex-1">{children ?? <Outlet />}</main>
      <Footer />
      {/*
       * CookiesConsent is rendered last so its `z-50` overlay sits above
       * TopNav (`z-40`) and the page content. It unmounts itself once the
       * user clicks a button, so subsequent visits don't show the dialog.
       */}
      <CookiesConsent />
    </div>
  );
}
