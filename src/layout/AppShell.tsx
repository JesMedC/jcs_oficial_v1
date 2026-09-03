import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { AuroraBackground } from './AuroraBackground';
import { TopNav } from './TopNav';
import { Footer } from './Footer';
import { CookiesConsent } from '../components/consent/CookiesConsent';
import { DotGrid } from '../components/decor/DotGrid';
import { NeuralNetwork } from '../components/decor/NeuralNetwork';

interface AppShellProps {
  readonly children?: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    // design-system-v1 (Wave 6, T6.4) — added `relative` so the decorative
    // backgrounds below have a positioning ancestor. Both are
    // `-z-10 pointer-events-none` so neither intercepts clicks.
    //
    // Wave 6.5 (Nivel 1 bump) — bumped DotGrid opacity 0.04→0.08 and mounted
    // NeuralNetwork at 0.05 opacity. DotGrid renders first (deepest layer),
    // NeuralNetwork on top of it (slightly more prominent cyberpunk feel),
    // AuroraBackground on top of both. Final ordering:
    // DotGrid (lowest) → NeuralNetwork → AuroraBackground → content.
    <div className="relative min-h-dvh flex flex-col bg-bg text-text-primary">
      <DotGrid opacity={0.08} />
      <NeuralNetwork opacity={0.05} nodeCount={24} edgeDensity={0.25} />
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
