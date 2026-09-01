# JadeCapitalSuite — Portal público

El portal público de **JadeCapitalSuite**: el sistema operativo del trader. Este repositorio
arranca con la **P-1A**, que deja listo el toolchain y el sistema de diseño (tokens cyan + fuente
display Orbitron). Las páginas, formularios, SEO, Dockerfile y documentación detallada llegan en
sub-slices posteriores (`p1b`–`p1f`).

## Stack

- **Frontend**: React 18 + TypeScript estricto + Vite 5 + Tailwind CSS 3
- **Forms** (P-1B+): React Hook Form + Zod (`@hookform/resolvers`)
- **Routing** (P-1B+): React Router v6 (`createBrowserRouter`, `React.lazy` por ruta)
- **SEO** (P-1F): react-helmet-async + Schema.org + `vite-plugin-prerender` (top 3 rutas)
- **Tipografía**: Orbitron (display) + Inter (body) + JetBrains Mono (mono), self-hosted vía `@fontsource`
- **Calidad**: ESLint flat config + Prettier + Vitest (jsdom + v8 coverage)
- **Despliegue** (P-1F): Dockerfile multi-stage (`node:22-alpine` → `nginx:1.27-alpine`)

## Scripts

| Comando                 | Qué hace                                    |
| ----------------------- | ------------------------------------------- |
| `pnpm install`          | Instala dependencias según `pnpm-lock.yaml` |
| `pnpm run dev`          | Vite dev server en `http://localhost:5173`  |
| `pnpm run build`        | `tsc -b` + `vite build` → `dist/`           |
| `pnpm run preview`      | Sirve `dist/` en `http://localhost:4173`    |
| `pnpm run typecheck`    | `tsc -b --noEmit`                           |
| `pnpm run lint`         | ESLint en todo el repo (0 warnings)         |
| `pnpm run format`       | Prettier `--write`                          |
| `pnpm run format:check` | Prettier `--check`                          |
| `pnpm run test`         | Vitest single run (sin tests aún en P-1A)   |

## Próximamente

- **P-1A (esta entrega)**: toolchain + sistema de diseño (cyan + Orbitron).
- **slice p1b**: shell de la app, TopNav, Footer, fondo Aurora.
- **slice p1c**: páginas Home, Pricing, Features y 404.
- **slice p1d**: páginas About, Contact, Demo + formularios con pipeline 4R.
- **slice p1e**: placeholders de autenticación, Newsletter y stubs legales.
- **slice p1f**: bundle SEO, JSON-LD, sitemap, Dockerfile, LHCI.

El README completo, la guía de contribución y la documentación por área se entregan en el slice
final (`p1f`).
