import { Suspense } from 'react';
import { createBrowserRouter, Outlet, RouterProvider, ScrollRestoration } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { RouteFallback } from '../components/RouteFallback';
import { routeChildren } from './config';

function RootShell() {
  return (
    <>
      <ScrollRestoration />
      <AppShell>
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </AppShell>
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <RootShell />,
    children: routeChildren,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
