# Portal UI redesign

## Goal
Refresh the authenticated user portal into a professional trading SaaS: clearer hierarchy, stronger data readability, calmer visual language, and a polished responsive shell.

## Scope
- Establish a coherent dark-first trading workspace visual system while preserving light mode.
- Improve authenticated shell/navigation/header hierarchy and responsive behavior.
- Improve dashboard presentation so KPIs, account scope, performance, and recent activity are easier to scan.
- Validate with focused typecheck and tests relevant to touched surfaces.

## Non-goals
- No backend/API contract changes.
- No new trading calculations or persistence behavior.
- No destructive migration of existing routes/components.

## Tasks
- [x] Refine portal design tokens and global surface/typography treatment.
- [x] Refine authenticated navigation shell and responsive chrome.
- [x] Refine dashboard information hierarchy and responsive layout.
- [x] Run validation and record evidence.

## Evidence
- Added portal-specific dark-first surface, border, glow, and shell tokens while preserving the cyan brand ladder and light-mode variants.
- Refined the authenticated shell/header/sidebar/footer with calmer glass surfaces, stronger hierarchy, compact responsive spacing, and Spanish navigation labels.
- Refined the dashboard hero, CTA, content width, performance placeholder panel, and right-rail layout without removing existing test selectors.
- `pnpm run typecheck`: passed.
- `pnpm run lint`: passed.
- Focused portal/dashboard tests: passed (5 files, 32 tests).
- `pnpm run build`: passed.
- Non-blocking warnings remain from existing React `act(...)`, jsdom XHR, localStorage test setup, and TanStack sourcemaps.
