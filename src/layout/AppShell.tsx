import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { AuroraBackground } from './AuroraBackground';
import { TopNav } from './TopNav';
import { Footer } from './Footer';
import { CookiesConsent } from '../components/consent/CookiesConsent';

interface AppShellProps {
  readonly children?: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-bg text-text-primary">
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
