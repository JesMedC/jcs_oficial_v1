# Tasks: Platform-wide visual redesign

## Foundation
- [x] Add semantic visual token aliases and document migration compatibility.
- [ ] Normalize canonical surface, page header, action button, metric, badge, state, and table primitives.
- [x] Add accessible public reveal/motion utilities with reduced-motion behavior.
- [ ] Add focused primitive and token tests.

## Shells
- [x] Isolate `/admin/*` from public marketing chrome.
- [ ] Align public shell navigation/footer with the semantic system and responsive CTA behavior.
- [ ] Align user and admin shell spacing, status treatment, and responsive navigation.
- [ ] Add shell regression tests.

## Public conversion experience
- [ ] Redesign home hero and first viewport for clear value proposition and primary CTA.
- [ ] Add trust/product narrative sections and responsive workspace preview.
- [ ] Redesign pricing, features, about, login, and register surfaces around conversion clarity.
- [ ] Add public responsive, accessibility, and reduced-motion tests.

## User workspace
- [ ] Migrate dashboard and accounts to shared page chrome and metric/surface primitives.
- [ ] Migrate operations, diary, playbook, and configuration states and tables.
- [ ] Preserve existing data-testid contracts and behavior tests.

## Admin workspace
- [ ] Migrate admin dashboard and analytics to shared metrics and panels.
- [ ] Migrate users, plans, and payments to shared tables, forms, and states.
- [ ] Preserve admin auth and mutation behavior.

## Validation
- [ ] Run focused tests after each slice.
- [ ] Run typecheck and lint.
- [ ] Run responsive/accessibility checks.
- [ ] Run production build and record evidence.
