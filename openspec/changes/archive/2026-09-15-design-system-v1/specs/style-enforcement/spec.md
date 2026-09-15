# Spec: style-enforcement

## Purpose

Define the drift-prevention strategy that keeps the Cyber-Jade tokens stable after `design-system-v1` ships. This spec codifies lint rules, a CI grep guard, and a convention document — and binds promotion to hard-error status to a future change after one release cycle.

## Requirements

### Requirement: ESLint custom rule `no-cyaan-literals`

The system SHALL expose a custom ESLint rule `no-cyaan-literals` (note the spelling) that flags any identifier, string, or template literal in `*.ts` and `*.tsx` matching `cyan`, `#00FFFF`, `rgba(0,255,255,*)`, `stroke="#00FFFF"`, or `pulse-cyan`. The rule MUST be enabled with severity `warn` (not `error`) for this change. Allow-list: `tailwind.config.ts`, `docs/design-system.md`, `openspec/changes/design-system-v1/specs/**`.

#### Scenario: Cyan literal flagged
- GIVEN a file containing `stroke="#00FFFF"`
- WHEN `pnpm lint` runs
- THEN the rule MUST report a `warn` with the line number

#### Scenario: Allowed file not flagged
- GIVEN `tailwind.config.ts` containing `#00FFFF` in a comment
- WHEN `pnpm lint` runs
- THEN no warning SHALL be emitted

### Requirement: Stylelint config

The system SHALL expose `.stylelintrc.json` with a rule banning raw cyan rgba in `*.css` files and inline `style={{}}` blocks in `*.tsx` outside the allow-list. Severity: `warn` for this change. Promotion to `error` is a future change.

#### Scenario: CSS cyan banned
- GIVEN a `*.css` file with `color: rgba(0,255,255,1);`
- WHEN `pnpm stylelint` runs
- THEN a `warn` MUST be emitted

### Requirement: CI grep guard

CI MUST run `rg "rgba\(0,255,255|#00FFFF|stroke=\"#00FFFF" src/` and fail the build if any match exists outside the allow-list. The grep guard is `error`-severity (it is a binary check, not a lint rule), but the lint rules above remain `warn` for this change.

#### Scenario: Guard catches drift
- GIVEN a stray `rgba(0,255,255,0.5)` in `src/components/Foo.tsx`
- WHEN CI runs the grep guard
- THEN the build MUST fail with the offending line printed

#### Scenario: Guard allows config file
- GIVEN the same literal in `tailwind.config.ts`
- WHEN CI runs the grep guard
- THEN the build MUST pass

### Requirement: Convention document `docs/design-system.md`

The system SHALL expose `docs/design-system.md` with sections: Color, Typography, Glow, Glass, Decor, Component Recipe, Anti-patterns. Each section MUST cite the spec it derives from (`cyber-jade-tokens`, `primitive-library`, etc.). Anti-patterns MUST list at minimum: glow on numeric cells, cyan literals outside the allow-list, hardcoded `#00FF9D` in components (use the token).

#### Scenario: Document covers all sections
- GIVEN `docs/design-system.md`
- WHEN read
- THEN the seven required headings MUST appear in order

#### Scenario: Anti-patterns cited
- GIVEN the Anti-patterns section
- WHEN read
- THEN at least three concrete anti-patterns MUST be listed with the correct token fix

### Requirement: Promotion deferred

Promotion of the lint rules from `warn` to `error` is OUT OF SCOPE for this change. A future change (after one release cycle in production) MUST re-evaluate the rule severities based on false-positive rate.

#### Scenario: Promotion not applied
- GIVEN this change's CI configuration
- WHEN read
- THEN `eslint.config.js` MUST configure `no-cyaan-literals` as `warn`, not `error`

## Dependencies

- `eslint`, `stylelint`, `pnpm` (existing toolchain)
- `cyber-jade-tokens` (for the allow-list rationale)
- `primitive-library` (for the Component Recipe section)

## Out of scope

- A design-tokens.json export to external tooling.
- Visual regression baselines in CI (Playwright snapshots deferred).
- Promoting lint rules to error (future change).
