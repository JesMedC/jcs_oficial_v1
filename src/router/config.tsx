/* eslint-disable react-refresh/only-export-components --
 * this file is a central route table that mixes lazy components and route
 * metadata. React Fast Refresh would not help here anyway because the
 * lazy chunks are fetched dynamically. */

import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

/*
 * p1b router config.
 *
 * All page components are imported from `pages/_stub.tsx` until the real
 * page files land in p1c (Home/Pricing/Features/NotFound), p1d
 * (About/Contact/Demo) and p1e (Login/Register/Privacy/Terms/Cookies).
 * When those slices ship, this file will be updated to point at the
 * concrete page modules.
 */

const HomePage = lazy(() => import('../pages/_stub').then((m) => ({ default: m.HomePage })));
const PricingPage = lazy(() => import('../pages/_stub').then((m) => ({ default: m.PricingPage })));
const FeaturesPage = lazy(() =>
  import('../pages/_stub').then((m) => ({ default: m.FeaturesPage })),
);
const AboutPage = lazy(() => import('../pages/_stub').then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import('../pages/_stub').then((m) => ({ default: m.ContactPage })));
const DemoPage = lazy(() => import('../pages/_stub').then((m) => ({ default: m.DemoPage })));
const LoginPage = lazy(() => import('../pages/_stub').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() =>
  import('../pages/_stub').then((m) => ({ default: m.RegisterPage })),
);
const PrivacyPage = lazy(() => import('../pages/_stub').then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('../pages/_stub').then((m) => ({ default: m.TermsPage })));
const CookiesPage = lazy(() => import('../pages/_stub').then((m) => ({ default: m.CookiesPage })));
const NotFoundPage = lazy(() =>
  import('../pages/_stub').then((m) => ({ default: m.NotFoundPage })),
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
  { path: '*', element: <NotFoundPage /> },
];
