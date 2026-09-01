import { Link } from 'react-router-dom';
import { SeoHead } from '../components/SeoHead';

/*
 * p1b placeholder stubs.
 *
 * The router in this slice imports each lazy page from THIS file rather than
 * from individual page modules. When later slices land, the router will be
 * updated to point at real page files:
 *   - p1c → HomePage, PricingPage, FeaturesPage, NotFoundPage
 *   - p1d → AboutPage, ContactPage, DemoPage
 *   - p1e → LoginPage, RegisterPage, PrivacyPage, TermsPage, CookiesPage
 *
 * Until those files exist, every route renders one of these stubs so the
 * shell, navigation and SEO contract can be exercised end to end.
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
      <div className="container mx-auto max-w-3xl py-20 px-4">
        <h1 className="font-display uppercase tracking-wide text-primary text-4xl md:text-5xl">
          {label}
        </h1>
        <p className="text-text-secondary mt-4 text-base md:text-lg">
          Próximamente — slice {landingSlice}.
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

export function HomePage() {
  return (
    <StubPage
      label="Inicio"
      landingSlice="p1c"
      meta={{
        title: 'Inicio',
        description:
          'JadeCapitalSuite es el sistema operativo del trader: centralizá cuentas, operaciones, riesgo, journal y estrategia.',
        canonicalPath: '/',
      }}
    />
  );
}

export function PricingPage() {
  return (
    <StubPage
      label="Precios"
      landingSlice="p1c"
      meta={{
        title: 'Precios',
        description:
          'Planes simples para traders individuales y equipos. Free, Plus y Pro con centralización de cuentas y riesgo.',
        canonicalPath: '/pricing',
      }}
    />
  );
}

export function FeaturesPage() {
  return (
    <StubPage
      label="Características"
      landingSlice="p1c"
      meta={{
        title: 'Características',
        description:
          'Todo lo que necesitás, en un solo lugar: operations terminal, journal, P&L calendar, risk center y AI copilot.',
        canonicalPath: '/features',
      }}
    />
  );
}

export function AboutPage() {
  return (
    <StubPage
      label="Nosotros"
      landingSlice="p1d"
      meta={{
        title: 'Nosotros',
        description:
          'Tecnología Jade: el equipo detrás de JadeCapitalSuite. Construido por traders para traders en LATAM.',
        canonicalPath: '/about',
      }}
    />
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
          'Hablemos. Contacto comercial, partnerships y prensa en contact@jadecapitalsuite.com.',
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
          'Solicitá un recorrido de 30 minutos por JadeCapitalSuite con un especialista de producto.',
        canonicalPath: '/demo',
      }}
    />
  );
}

export function LoginPage() {
  return (
    <StubPage
      label="Iniciar sesión"
      landingSlice="p1e"
      meta={{
        title: 'Iniciar sesión',
        description: 'Acceso a JadeCapitalSuite. Disponible en Fase 1.',
        canonicalPath: '/login',
      }}
    />
  );
}

export function RegisterPage() {
  return (
    <StubPage
      label="Crear cuenta"
      landingSlice="p1e"
      meta={{
        title: 'Crear cuenta',
        description: 'Registro en JadeCapitalSuite. Disponible en Fase 1.',
        canonicalPath: '/register',
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
        title: 'Política de privacidad',
        description:
          'Cómo JadeCapitalSuite trata datos personales. Contacto legal@jadecapitalsuite.com.',
        canonicalPath: '/privacy',
      }}
    />
  );
}

export function TermsPage() {
  return (
    <StubPage
      label="Términos"
      landingSlice="p1e"
      meta={{
        title: 'Términos y condiciones',
        description:
          'Términos y condiciones de uso de JadeCapitalSuite. Contacto legal@jadecapitalsuite.com.',
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
        title: 'Política de cookies',
        description: 'Cómo usamos cookies en JadeCapitalSuite.',
        canonicalPath: '/cookies',
      }}
    />
  );
}

export function NotFoundPage() {
  return (
    <StubPage
      label="404 — Esta ruta no existe"
      landingSlice="—"
      meta={{
        title: '404',
        description: 'La ruta que buscás no existe en JadeCapitalSuite.',
        canonicalPath: '/404',
      }}
    />
  );
}
