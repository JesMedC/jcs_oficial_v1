# Specification: Platform-wide visual redesign

## Requirements

### Requirement 1: Semantic visual system
The platform SHALL expose semantic design tokens for background, elevated surface, glass surface, primary accent, positive state, risk state, text hierarchy, border, focus, shadow, and motion duration. Existing compatibility token names SHALL remain usable during migration.

#### Scenario: Shared token usage
- GIVEN a public, user, or admin surface
- WHEN a shared panel, button, metric, or navigation element renders
- THEN it uses semantic tokens rather than page-specific color literals.

### Requirement 2: Motion and accessibility
The public portal SHALL provide fluid entrance, hover, and section transitions that do not block interaction. All non-essential motion SHALL be disabled or reduced when `prefers-reduced-motion: reduce` is active.

#### Scenario: Reduced motion
- GIVEN a visitor with reduced motion enabled
- WHEN the public portal loads or changes sections
- THEN content remains visible and usable without animated displacement or looping effects.

### Requirement 3: Conversion-oriented public portal
The public portal SHALL communicate the product value within the first viewport, maintain clear primary calls to action, show credible product proof, and preserve readable responsive layouts across mobile and desktop.

#### Scenario: First-visit conversion path
- GIVEN an unauthenticated visitor on the home page
- WHEN the visitor scans the hero and first content sections
- THEN the value proposition, primary CTA, product category, and next step are visible without requiring a dashboard-style interaction.

### Requirement 4: User workspace shell
The authenticated user portal SHALL use a persistent responsive navigation rail, compact status header, high-density but readable cards, and consistent page headers across dashboard, accounts, operations, diary, playbook, and configuration.

#### Scenario: User navigation
- GIVEN an authenticated user on any `/portal/*` route
- WHEN the viewport changes between desktop and mobile
- THEN navigation remains reachable, the current route is clear, and the main content does not overflow horizontally.

### Requirement 5: Admin workspace shell
The admin portal SHALL use a dedicated operational shell and SHALL NOT inherit public marketing navigation or footer chrome. Admin surfaces SHALL share the semantic visual system but use calmer operational hierarchy than the trading workspace.

#### Scenario: Admin isolation
- GIVEN an authenticated administrator on `/admin/*`
- WHEN the route renders
- THEN admin navigation and status controls are visible and public marketing chrome is absent.

### Requirement 6: Shared primitives
The redesign SHALL standardize panels, page headers, buttons, badges, metric cards, tables, empty states, loading states, and error states through reusable components or documented wrappers.

#### Scenario: Consistent state treatment
- GIVEN two pages showing an empty, loading, or error state
- WHEN they render under the redesign
- THEN they use the same semantic structure, spacing, and state language.

### Requirement 7: Behavior preservation
The redesign SHALL preserve existing routes, authentication, API contracts, trade/account mutations, and user-visible business rules.

#### Scenario: Existing workflow
- GIVEN an existing account or trade workflow
- WHEN its visual components are replaced
- THEN the same data, mutation payloads, validation gates, and route transitions remain intact.

### Requirement 8: Validation
Each rollout slice SHALL include focused component tests and pass typecheck and lint. The complete redesign SHALL pass the configured build and relevant responsive/accessibility checks before archive.

#### Scenario: Slice verification
- GIVEN a completed redesign slice
- WHEN its checks run
- THEN failures identify the slice and do not get hidden behind unrelated full-repository diagnostics.
