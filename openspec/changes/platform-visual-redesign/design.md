# Design: Platform-wide visual redesign

## 1. Visual direction

Use a shared dark fintech foundation inspired by the reference image:

- Canvas: deep navy/graphite background with layered radial gradients.
- Primary accent: electric cyan for navigation, focus, links, and primary actions.
- Positive state: emerald/green for gains and healthy metrics.
- Risk state: coral/red for losses and blocking conditions.
- Secondary accent: muted violet/blue for analytical context.
- Surfaces: opaque elevated panels for dense data and translucent glass only where depth improves hierarchy.
- Typography: readable sans-serif for interface copy, tabular mono for financial values, display face only for brand moments and major public headings.
- Density: compact in user/admin workspaces; spacious and cinematic in public marketing.

Semantic names are canonical. Existing `jade` and `jarvis` names remain compatibility aliases while components migrate.

## 2. Token layers

### Foundation tokens
- `--color-bg-canvas`
- `--color-bg-elevated`
- `--color-bg-surface`
- `--color-brand-primary`
- `--color-brand-primary-strong`
- `--color-brand-glow`
- `--color-state-positive`
- `--color-state-risk`
- `--color-state-warning`
- `--color-text-primary`
- `--color-text-secondary`
- `--color-text-muted`
- `--color-border-subtle`
- `--color-border-strong`

### Layout tokens
- Shared content widths, shell rail widths, panel radius, control height, density gaps, and focus ring.
- Public sections use a larger spacing scale than workspace screens.

### Motion tokens
- `--motion-fast`: hover/focus feedback.
- `--motion-standard`: panel and route transitions.
- `--motion-slow`: public hero/section choreography.
- `--motion-ease-emphasized`: entrance easing.
- `@media (prefers-reduced-motion: reduce)` sets durations to near-zero and disables looping/decorative transforms.

## 3. Shared primitives

Create or normalize primitives under `src/components/ui`:

- `SurfacePanel`: elevated, glass, or outline variants.
- `PageHeader`: eyebrow, title, description, actions, optional status.
- `MetricCard`: label, value, delta, trend, contextual state.
- `StatusBadge`: semantic state and compact mode.
- `ActionButton`: primary, secondary, ghost, danger variants.
- `DataTable`: dense desktop table with responsive card fallback.
- `EmptyState`, `LoadingState`, `ErrorState`.
- `Reveal`: one accessible intersection-based entrance wrapper for public sections.

Existing primitives should be wrapped or migrated rather than duplicated. Root `src/components/GlassCard.tsx` becomes a compatibility wrapper around the canonical surface primitive.

## 4. Shell architecture

### Public shell
`AppShell` renders public `TopNav`, page content, and `Footer` only for public routes. Public pages use a `MarketingFrame` with:

- transparent-to-solid sticky navigation;
- CTA always visible on desktop and reachable in mobile menu;
- decorative layers isolated from content and disabled under reduced motion;
- max-width section container and predictable vertical rhythm.

### User shell
`PortalShell` remains the authenticated workspace frame:

- responsive collapsible rail;
- compact status header;
- route-aware page header;
- persistent global trade actions;
- dense surface variants for analytics and ledger data.

### Admin shell
`AdminLayout` becomes a standalone operational frame:

- no public `TopNav` or `Footer` inheritance;
- dedicated admin rail and top bar;
- same tokens and primitives as user portal;
- lower-glow, higher-contrast treatment for administrative tables and forms.

`AppShell` route detection must treat `/admin` the same as `/portal` when deciding whether public chrome is rendered.

## 5. Public conversion composition

### Home
1. Hero: clear category/value proposition, primary CTA, secondary sign-in CTA, animated market/data visual.
2. Trust strip: platform capabilities, security/discipline signals, and measurable outcomes without unsupported claims.
3. Product narrative: three-step workflow with progressive reveal.
4. Workspace preview: dashboard/account/trade visuals in a contained showcase frame.
5. Benefits grid: clear user outcomes, not feature jargon.
6. Pricing bridge: concise plan comparison and CTA.
7. Final CTA: low-friction registration path.

### Pricing/features/about/auth
- Pricing emphasizes decision clarity and plan comparison.
- Features use interactive but keyboard-accessible feature cards.
- About builds trust through story, principles, and product evidence.
- Login/register use focused auth panels with ambient motion that never competes with form completion.

## 6. User and admin composition

- Replace ad-hoc page headings with `PageHeader`.
- Use `MetricCard` for balances, P&L, exposure, and activity summaries.
- Use dense `DataTable` for operations, payments, users, and account movements.
- Use explicit loading/empty/error state primitives.
- Preserve Spanish user-facing copy and existing data-testid contracts where tests depend on them.

## 7. Responsive behavior

- Desktop: persistent rail + multi-column metric and table layouts.
- Tablet: narrower rail or overlay navigation; cards collapse from four to two columns.
- Mobile: drawer navigation, one-column metrics, table-to-card conversion, sticky primary action only where it does not obscure content.
- Never rely on horizontal page scrolling for primary workflows.

## 8. Accessibility and performance

- Visible keyboard focus using semantic focus tokens.
- Motion respects reduced-motion preferences.
- Decorative layers use `aria-hidden` and do not intercept pointer events.
- Color is not the sole indicator of financial state; include labels/icons/text.
- Lazy-load heavy decorative/public media and avoid unbounded animation loops.
- Preserve semantic headings and landmarks.

## 9. Rollout order

1. Token aliases, primitive normalization, and motion utilities.
2. Shell isolation and shared page chrome.
3. Public home and conversion surfaces.
4. Public pricing, features, about, and auth polish.
5. User dashboard and accounts.
6. User operations, diary, playbook, and configuration.
7. Admin dashboard and tables.
8. Responsive/accessibility regression pass and visual cleanup.

Each slice stays under the configured review budget and includes focused tests, typecheck, lint, and relevant build checks.
