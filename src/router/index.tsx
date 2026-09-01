import { Suspense } from 'react';
import { createBrowserRouter, Outlet, RouterProvider, ScrollRestoration } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { RouteFallback } from '../components/RouteFallback';
import { AuthProvider } from '../features/auth/AuthProvider';
import { PageviewTracker } from '../hooks/PageviewTracker';
import { routeChildren } from './config';

function RootShell() {
  return (
    <>
      <ScrollRestoration />
      <PageviewTracker />
      <AppShell>
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </AppShell>
    </>
  );
}

/*
 * p0a.2 — AuthProvider is wrapped around RootShell so every route
 * (public + protected) shares the same auth context. It MUST live
 * inside the router tree (i.e. below <RouterProvider>) so its
 * useNavigate call works; the data-router approach we use is
 * functionally equivalent to putting it inside <BrowserRouter>.
 */
const router = createBrowserRouter([
  {
    element: (
      <AuthProvider>
        <RootShell />
      </AuthProvider>
    ),
    children: routeChildren,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
