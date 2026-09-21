import { Link } from 'react-router-dom';
import { SeoHead } from '../components/SeoHead';

/*
 * p1b placeholder stubs.
 *
 * The router resolves the following routes through this file until
 * their owning slice ships:
 *   - p1d → ContactPage, DemoPage
 *   - p1e → PrivacyPage, TermsPage, CookiesPage
 *
 * p1c removed HomePage, PricingPage, FeaturesPage, AboutPage and
 * NotFoundPage from this file: those pages now live in concrete
 * modules under `src/pages/`.
 *
 * p0a.2 removed LoginPage + RegisterPage from this file: those
 * pages now live in `src/pages/LoginPage.tsx` and
 * `src/pages/RegisterPage.tsx` and are wired to the real backend
 * auth flow.
 */

interface StubPageMeta {
  readonly title: string;
  readonly description: string;
  readonly canonicalPath: string;
}

interface StubPageProps {
  readonly meta: StubPageMeta;
  readonly label: string;
  readonly landingSlice: string;
}

function StubPage({ meta, label, landingSlice }: StubPageProps) {
  return (
    <>
      <SeoHead
        title={meta.title}
        description={meta.description}
        canonicalPath={meta.canonicalPath}
      />
      <div className="container mx-auto max-w-3xl py-4 px-4">
        <h1 className="font-display uppercase tracking-wide text-3xl md:text-4xl">
          {label}
        </h1>
        <p className="text-text-secondary mt-4 text-base md:text-lg">
          Proximamente - slice {landingSlice}.
        </p>
        <Link
          to="/"
          className="text-primary mt-6 inline-block underline underline-offset-4 hover:text-primary/80 transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </>
  );
}

export function ContactPage() {
  return (
    <StubPage
      label="Contacto"
      landingSlice="p1d"
      meta={{
        title: 'Contacto',
        description:
          'Hablemos. Contacto comercial, partnerships y prensa en hola@jadecapitalsuite.com.',
        canonicalPath: '/contact',
      }}
    />
  );
}

export function DemoPage() {
  return (
    <StubPage
      label="Solicitar demo"
      landingSlice="p1d"
      meta={{
        title: 'Solicitar demo',
        description:
          'Solicita un recorrido de 30 minutos por JadeCapitalSuite con un especialista de producto.',
        canonicalPath: '/demo',
      }}
    />
  );
}

export function PrivacyPage() {
  return (
    <StubPage
      label="Privacidad"
      landingSlice="p1e"
      meta={{
        title: 'Politica de privacidad',
        description:
          'Como JadeCapitalSuite trata datos personales. Contacto hola@jadecapitalsuite.com.',
        canonicalPath: '/privacy',
      }}
    />
  );
}

export function TermsPage() {
  return (
    <StubPage
      label="Terminos"
      landingSlice="p1e"
      meta={{
        title: 'Terminos y condiciones',
        description:
          'Terminos y condiciones de uso de JadeCapitalSuite. Contacto hola@jadecapitalsuite.com.',
        canonicalPath: '/terms',
      }}
    />
  );
}

export function CookiesPage() {
  return (
    <StubPage
      label="Cookies"
      landingSlice="p1e"
      meta={{
        title: 'Politica de cookies',
        description: 'Como usamos cookies en JadeCapitalSuite.',
        canonicalPath: '/cookies',
      }}
    />
  );
}
