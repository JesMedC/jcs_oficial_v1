import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { AuroraBackground } from './AuroraBackground';
import { TopNav } from './TopNav';
import { Footer } from './Footer';

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
    </div>
  );
}
