NOTE: AI must read docs/ai/README.md before modifying this file.

Version: 2026-02-01

Changelog:
- 2026-02-01: Added reusable checklists for common tasks.
- 2026-02-05: Moved `rules_checklists.md` into module folder and created this `README.md` as canonical location.

# AI Checklists

> Canonical checklists used across AI tasks for consistency and safety.

## Skills (automation)

- [run-checklist](skills/run-checklist/): Validates checklists by running through each item and reporting compliance status

---

(Original content follows)

NOTE: AI must read docs/ai/README.md before modifying this file.

Version: 2026-02-01

Changelog:
- 2026-02-01: Added reusable checklists for common tasks.

# AI Checklists

## Checklist: Editing a feature design/mockup

- Confirm feature has `docs/features/<Feature>/design.md` and it is canonical.
- Run contradiction scan across related docs/config/mockups.
- Update `Version:` and `Changelog:`.
- Update Coverage Checklist:
  - No missing files
  - No ❌ items
  - Mockup implements the claimed mechanisms

## Checklist: Editing shared hub UI behavior

- Read `docs/foundation/constraints.md` + the feature `design.md`.
- Ensure behavior matches the design.
- If design changes are required, update docs+mockups together.

## Checklist: Adding/changing a game event

- Define/extend schema (namespaced eventType, schemaVersion).
- Add adapter mapping to:
  - Room projections (only allowed list)
  - Game projections (effects/animations)
- Add fixtures and adapter tests.
- If UX changes, update design docs + coverage.