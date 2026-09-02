/* eslint-disable react-refresh/only-export-components --
 * this file is a central route table that mixes lazy components and route
 * metadata. React Fast Refresh would not help here anyway because the
 * lazy chunks are fetched dynamically. */

import { lazy } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';

import { ProtectedRoute } from '../features/auth/ProtectedRoute';

/*
 * p0b.2 router config (extended in p0d.2).
 *
 * The public routes (home, pricing, features, about, login, register,
 * legal, contact, demo, 404) stay flat. The auth-gated routes
 * (portal-select, /portal/*, /portal/upgrade, and the legacy
 * /dashboard* redirects) are nested under ProtectedRoute. The admin
 * routes (admin, admin/users, admin/plans) share AdminLayout which
 * mounts AdminAuthGuard — the role/portal check happens at the
 * layout boundary, not in a wrapper route.
 *
 * p0d.2: the user portal moved under /portal/*. The shell wrapper
 * (PortalShell) renders PortalSidebar on the left and an <Outlet />
 * for the routed page; /portal/upgrade is intentionally kept outside
 * the shell so the checkout flow stays distraction-free. The legacy
 * /dashboard and /dashboard/upgrade paths still resolve as Navigate
 * redirects so existing bookmarks and links keep working.
 */

const HomePage = lazy(() => import('../pages/HomePage').then((m) => ({ default: m.HomePage })));
const PricingPage = lazy(() =>
  import('../pages/PricingPage').then((m) => ({ default: m.PricingPage })),
);
const FeaturesPage = lazy(() =>
  import('../pages/FeaturesPage').then((m) => ({ default: m.FeaturesPage })),
);
const AboutPage = lazy(() => import('../pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const NotFoundPage = lazy(() =>
  import('../pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);

const ContactPage = lazy(() => import('../pages/_stub').then((m) => ({ default: m.ContactPage })));
const DemoPage = lazy(() => import('../pages/_stub').then((m) => ({ default: m.DemoPage })));
const LoginPage = lazy(() => import('../pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() =>
  import('../pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const PrivacyPage = lazy(() => import('../pages/_stub').then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('../pages/_stub').then((m) => ({ default: m.TermsPage })));
const CookiesPage = lazy(() => import('../pages/_stub').then((m) => ({ default: m.CookiesPage })));

const PortalSelector = lazy(() =>
  import('../features/auth/PortalSelector').then((m) => ({ default: m.PortalSelector })),
);
const PortalShell = lazy(() =>
  import('../components/portal/PortalShell').then((m) => ({ default: m.PortalShell })),
);
const PortalDashboardPage = lazy(() =>
  import('../pages/portal/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const PortalCuentasPage = lazy(() =>
  import('../pages/portal/CuentasPage').then((m) => ({ default: m.CuentasPage })),
);
const PortalMovimientosPage = lazy(() =>
  import('../pages/portal/MovimientosPage').then((m) => ({ default: m.MovimientosPage })),
);
const PortalConfiguracionPage = lazy(() =>
  import('../pages/portal/ConfiguracionPage').then((m) => ({ default: m.ConfiguracionPage })),
);
const UpgradePage = lazy(() =>
  import('../pages/UpgradePage').then((m) => ({ default: m.UpgradePage })),
);

// Admin pages — live in `pages/admin/` so they don't collide with the
// public AdminDashboardPage placeholder that ships in p0a.2. The
// old `pages/AdminDashboardPage.tsx` file is kept for backward compat
// (re-export shim) but the router only references the admin module.
const AdminDashboardPage = lazy(() =>
  import('../pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
);
const AdminUsersPage = lazy(() =>
  import('../pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })),
);
const AdminPlansPage = lazy(() =>
  import('../pages/admin/AdminPlansPage').then((m) => ({ default: m.AdminPlansPage })),
);
const AdminPaymentsPage = lazy(() =>
  import('../pages/admin/AdminPaymentsPage').then((m) => ({ default: m.AdminPaymentsPage })),
);
const AdminAnalyticsPage = lazy(() =>
  import('../pages/admin/AdminAnalyticsPage').then((m) => ({ default: m.AdminAnalyticsPage })),
);

const PaymentSuccessPage = lazy(() =>
  import('../pages/PaymentSuccessPage').then((m) => ({ default: m.PaymentSuccessPage })),
);
const PaymentFailurePage = lazy(() =>
  import('../pages/PaymentFailurePage').then((m) => ({ default: m.PaymentFailurePage })),
);

const AdminLayout = lazy(() =>
  import('../layout/AdminLayout').then((m) => ({ default: m.AdminLayout })),
);

export const routeChildren: RouteObject[] = [
  { path: '/', element: <HomePage /> },
  { path: '/pricing', element: <PricingPage /> },
  { path: '/features', element: <FeaturesPage /> },
  { path: '/about', element: <AboutPage /> },
  { path: '/contact', element: <ContactPage /> },
  { path: '/demo', element: <DemoPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/privacy', element: <PrivacyPage /> },
  { path: '/terms', element: <TermsPage /> },
  { path: '/cookies', element: <CookiesPage /> },
  // p0c — callbacks publicos de MercadoPago (sin ProtectedRoute).
  { path: '/payment/success', element: <PaymentSuccessPage /> },
  { path: '/payment/failure', element: <PaymentFailurePage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/portal-select', element: <PortalSelector /> },
      // p0d.2 — user portal shell with vertical sidebar.
      {
        path: '/portal',
        element: <PortalShell />,
        children: [
          { index: true, element: <Navigate to="/portal/dashboard" replace /> },
          { path: 'dashboard', element: <PortalDashboardPage /> },
          { path: 'cuentas', element: <PortalCuentasPage /> },
          { path: 'movimientos', element: <PortalMovimientosPage /> },
          { path: 'configuracion', element: <PortalConfiguracionPage /> },
        ],
      },
      // /portal/upgrade lives outside the shell so the checkout flow
      // stays distraction-free (no sidebar noise during payment).
      { path: '/portal/upgrade', element: <UpgradePage /> },
      // Legacy redirects — old /dashboard URLs still resolve so any
      // bookmark, deep-link, or in-app reference that hasn't been
      // updated keeps working. The codebase grep for the literal
      // path with closing quote is expected to match ONLY these two
      // entries (plus the AdminAuthGuard fallback).
      { path: '/dashboard', element: <Navigate to="/portal/dashboard" replace /> },
      { path: '/dashboard/upgrade', element: <Navigate to="/portal/upgrade" replace /> },
    ],
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: 'users', element: <AdminUsersPage /> },
      { path: 'plans', element: <AdminPlansPage /> },
      { path: 'payments', element: <AdminPaymentsPage /> },
      { path: 'analytics', element: <AdminAnalyticsPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
];
