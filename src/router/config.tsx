/* eslint-disable react-refresh/only-export-components --
 * this file is a central route table that mixes lazy components and route
 * metadata. React Fast Refresh would not help here anyway because the
 * lazy chunks are fetched dynamically. */

import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ProtectedRoute } from '../features/auth/ProtectedRoute';

/*
 * p0b.2 router config.
 *
 * The public routes (home, pricing, features, about, login, register,
 * legal, contact, demo, 404) stay flat. The auth-gated routes
 * (portal-select, dashboard, dashboard/upgrade) are nested under
 * ProtectedRoute. The admin routes (admin, admin/users, admin/plans)
 * share AdminLayout which mounts AdminAuthGuard — the role/portal
 * check happens at the layout boundary, not in a wrapper route.
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
const DashboardPage = lazy(() =>
  import('../pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
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
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/portal-select', element: <PortalSelector /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/dashboard/upgrade', element: <UpgradePage /> },
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
