NOTE: AI must read docs/ai/README.md before modifying this file.

Version: 2026-02-03

Changelog:
- 2026-02-01: Extracted docs/mockups/DSL governance rules.
- 2026-02-03: Linked hub testing documentation rules module.
- 2026-02-05: Moved `rules_docs.md` into module folder and created this `README.md` as canonical location.

# Docs Rules (Design/Mockups/DSL)

> Canonical location for docs rules. This module contains the rules that apply to design docs, mockups, DSLs, and related artifacts.

## Skills (automation)

- `check-preface`: Validates that files have the required AI preface.
- `scan-contradictions`: Scans for contradictions in related documents.
- `validate-coverage`: Checks Coverage Checklists for completeness.

Skills are located under `docs/ai/rules_docs/skills/`.

---

(Original content follows)

NOTE: AI must read docs/ai/README.md before modifying this file.

Version: 2026-02-03

Changelog:
- 2026-02-01: Extracted docs/mockups/DSL governance rules.
- 2026-02-03: Linked hub testing documentation rules module.
- 2026-02-03: Updated testing rules module name to `rules_test_hub/README.md`.

# Docs Rules (Design/Mockups/DSL)

## Scope

Applies when editing/adding:

- Design docs: `docs/**/*.md`
- DSL/config: `docs/**/*.yaml`, `docs/**/*.yml`
- Mockups/assets: `docs/**/*.html`, `docs/**/*.svg`

## 1) Preface requirement

Every design/mockup/DSL file must include a top preface instructing AI to read `docs/ai/README.md`.

If missing:

- STOP and request confirmation before proceeding.

## 2) Canonical sources and coverage gates

- Each feature must have `docs/features/<Feature>/design.md`.
- That file is the canonical truth; other artifacts must match it.

Coverage Checklist hard gate:

- If a feature `design.md` lacks a Coverage Checklist, AI must stop.
- If any row is ❌ missing, AI must stop.
- If checklist references a non-existent file, AI must stop.

## 3) Contradiction scan (required)

When modifying any design artifact, AI must scan for contradictions in related documents:

- Component docs for the feature
- Parent/child feature docs
- Shared configs (`docs/config/`, theme tokens, i18n)
- Mockup collection/index docs

AI must report:

- Files scanned
- Conflicts found
- Proposed fixes

If conflicts are found, prefer synchronized updates across affected files.

## 4) Component doc template (required)

Component spec docs under `docs/features/<Feature>/**` must include:

- NOTE preface
- `Version:`
- `Changelog:`
- H1: `# <ComponentName> Component Design`
- Standard sections (keep headings, write `- None` if not applicable)

## 5) DSL canonicalization

- Canonical DSL locations:
  - Global config: `docs/config/`
  - Feature config: `docs/features/<Feature>/`
- Do not keep duplicates outside `docs/`.

## 6) Mockup coverage policy

Feature mockups must encode mechanisms (state + interactions), not only visuals.

If a mechanism cannot be implemented in the feature mockup:

- Add a visible Coverage section describing what’s intentionally omitted.
- Link to the component-level spec/mockup.

## 7) Testing documentation (required)

Design/spec docs must include a `## Testing` section with Unit/Integration/E2E tables, and each major folder must have a `tests.md` index.

Canonical rules and template:

- `docs/ai/rules_test_hub/README.md`