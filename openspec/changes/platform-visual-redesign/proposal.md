# Proposal: Platform-wide visual redesign

## Summary
Create a coherent visual system across the public marketing portal, authenticated user portal, and administrator portal, inspired by the supplied Bitcora.trade reference while preserving product clarity and existing behavior.

## Product intent
The public portal should attract qualified prospects through a premium fintech presentation: strong visual hierarchy, fluid transitions, responsive storytelling, clear calls to action, and credible trading-oriented data presentation. Authenticated surfaces should prioritize fast scanning, density, and operational confidence.

## Scope
- Establish one semantic visual language for colors, surfaces, typography, spacing, motion, focus states, and responsive behavior.
- Build shared primitives for panels, buttons, page headers, metrics, tables, badges, navigation, and motion.
- Unify user and admin shells without making admin inherit public marketing chrome.
- Redesign user portal pages progressively, starting with dashboard and account views.
- Redesign admin pages using the same foundation with an operational, less promotional treatment.
- Redesign public home, pricing, features, about, authentication, and conversion surfaces with stronger visual storytelling and fluid but accessible transitions.
- Preserve routes, API contracts, business rules, and existing frontend behavior.

## Public portal direction
- Dark premium fintech canvas with cyan/emerald highlights and restrained red risk states.
- Animated hero layers, gradient motion, reveal transitions, hover lift, and responsive section choreography.
- Conversion-first hierarchy: one primary CTA per section, proof points, pricing clarity, and low-friction navigation.
- Respect `prefers-reduced-motion`; motion must not block content or interaction.
- Keep public pages visually related to the trading workspace without copying its dense dashboard layout.

## Non-goals
- No backend business-rule changes.
- No route or authentication redesign.
- No replacement of the trading data model.
- No decorative animation that harms readability, performance, or accessibility.

## Acceptance criteria
- Public, user, and admin surfaces use the same semantic token vocabulary and shared primitives.
- Public landing and pricing flows have responsive conversion-oriented layouts with tested reduced-motion behavior.
- `/admin/*` renders with admin chrome rather than public header/footer chrome.
- Existing focused tests, typecheck, lint, and build remain green after each slice.
- Visual rollout is split into reviewable slices under the configured review budget.
