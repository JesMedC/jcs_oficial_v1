/* eslint-disable react-refresh/only-export-components --
 * this file is a central route table that mixes lazy components and route
 * metadata. React Fast Refresh would not help here anyway because the
 * lazy chunks are fetched dynamically. */

import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

/*
 * p1c router config.
 *
 * p1c swaps the 5 p1c-owned page lazy imports from `pages/_stub`
 * (HomePage, PricingPage, FeaturesPage, AboutPage, NotFoundPage) to
 * concrete modules. p1d (About/Contact/Demo), p1e (Login/Register
 * and the legal stubs) still resolve through `_stub` until those
 * slices ship.
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
const LoginPage = lazy(() => import('../pages/_stub').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() =>
  import('../pages/_stub').then((m) => ({ default: m.RegisterPage })),
);
const PrivacyPage = lazy(() => import('../pages/_stub').then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('../pages/_stub').then((m) => ({ default: m.TermsPage })));
const CookiesPage = lazy(() => import('../pages/_stub').then((m) => ({ default: m.CookiesPage })));

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
