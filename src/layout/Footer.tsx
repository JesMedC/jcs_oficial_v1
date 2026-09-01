import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

const productLinks: ReadonlyArray<{ label: string; to: string }> = [
  { label: 'Características', to: '/features' },
  { label: 'Precios', to: '/pricing' },
  { label: 'Registrarse', to: '/register' },
  { label: 'Estado del servicio', to: '#' },
];

const companyLinks: ReadonlyArray<{ label: string; to: string }> = [
  { label: 'Nosotros', to: '/about' },
  { label: 'Contacto', to: '/contact' },
  { label: 'Manifiesto', to: '#' },
];

const legalLinks: ReadonlyArray<{ label: string; to: string }> = [
  { label: 'Privacidad', to: '/privacy' },
  { label: 'Términos', to: '/terms' },
  { label: 'Cookies', to: '/cookies' },
];

function SocialIcon({ children, label }: { children: ReactNode; label: string }) {
  return (
    <a
      href="#"
      aria-label={label}
      className="inline-flex items-center justify-center w-5 h-5 text-primary hover:text-primary/70 transition-colors"
    >
      {children}
    </a>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-primary/20 bg-surface/40 backdrop-blur-md mt-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
            <h3 className="font-display uppercase tracking-[0.2em] text-primary text-sm">
              JadeCapitalSuite
            </h3>
            <p className="text-text-secondary text-sm leading-relaxed max-w-xs">
              El sistema operativo del trader. Centralizá cuentas, operaciones, riesgo, journal y
              estrategia en una sola plataforma.
            </p>
            <div className="flex items-center gap-4 mt-2">
              <SocialIcon label="Discord">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M19.27 5.33A17.78 17.78 0 0 0 14.93 4l-.21.42a13.36 13.36 0 0 0-5.44 0L9.07 4a17.78 17.78 0 0 0-4.34 1.33C2.05 9.16 1.34 12.9 1.7 16.59a17.92 17.92 0 0 0 5.46 2.77l.42-.59a11.7 11.7 0 0 1-1.85-.9l.46-.36a12.93 12.93 0 0 0 11.62 0l.46.36a11.7 11.7 0 0 1-1.85.9l.42.59a17.92 17.92 0 0 0 5.46-2.77c.43-4.39-.7-8.07-3.02-11.26ZM8.97 14.42a2.07 2.07 0 0 1-1.91-2.18 2.07 2.07 0 0 1 1.91-2.18 2.07 2.07 0 0 1 1.91 2.18 2.07 2.07 0 0 1-1.91 2.18Zm6.06 0a2.07 2.07 0 0 1-1.91-2.18 2.07 2.07 0 0 1 1.91-2.18 2.07 2.07 0 0 1 1.91 2.18 2.07 2.07 0 0 1-1.91 2.18Z" />
                </svg>
              </SocialIcon>
              <SocialIcon label="Telegram">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M21.94 4.42a1.07 1.07 0 0 0-1.12-.16L2.78 10.6a1.07 1.07 0 0 0 .07 2l3.69 1.05 1.78 5.66a1.07 1.07 0 0 0 1.7.5l2.56-2.21 3.93 2.93a1.07 1.07 0 0 0 1.65-.62l3.84-14.45a1.07 1.07 0 0 0-.06-1.04ZM9.84 16.78l-1.34-4.26 8.66-5.61Z" />
                </svg>
              </SocialIcon>
              <SocialIcon label="GitHub">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.93 10.93 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.76.11 3.05.73.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.13v3.16c0 .31.21.68.8.56 4.57-1.52 7.85-5.83 7.85-10.91C23.5 5.65 18.35.5 12 .5Z" />
                </svg>
              </SocialIcon>
              <SocialIcon label="X (Twitter)">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817-5.967 6.817H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231ZM17.083 19.77h1.833L7.084 4.126H5.117L17.083 19.77Z" />
                </svg>
              </SocialIcon>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="font-display uppercase tracking-wide text-text-primary text-xs">
              Producto
            </h4>
            <ul className="flex flex-col gap-2">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-text-secondary hover:text-primary text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="font-display uppercase tracking-wide text-text-primary text-xs">
              Empresa
            </h4>
            <ul className="flex flex-col gap-2">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-text-secondary hover:text-primary text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="font-display uppercase tracking-wide text-text-primary text-xs">
              Legal
            </h4>
            <ul className="flex flex-col gap-2">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-text-secondary hover:text-primary text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-primary/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-text-muted text-xs">
          <p>© 2026 Tecnología Jade — Todos los derechos reservados</p>
          <ul className="flex items-center gap-4">
            {legalLinks.map((link) => (
              <li key={link.label}>
                <Link to={link.to} className="hover:text-primary transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
