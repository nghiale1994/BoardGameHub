NOTE: AI must read docs/ai/README.md before modifying this file.

Version: 2026-02-06

Changelog:
- 2026-02-01: Introduced modular AI rules (core/docs/code-hub/code-game).
- 2026-02-02: Added explicit Core rules module (`rules_core.md`) to the entrypoint.
- 2026-02-03: Added hub testing docs rules module (`rules_test_hub.md`).
- 2026-02-05: Moved rule markdowns into module folders and colocated automation skills under `docs/ai/<rule>/skills`.
- 2026-02-05: Finalized migration and removed legacy files `docs/ai/rules_test_hub.md` and `docs/ai/rules_core.md`. Please reference module `README.md` files going forward.
- 2026-02-05: Added Available Skills Registry for quick reference of all automation skills.
- 2026-02-05: Updated Skills Registry with missing skills from rules_core and rules_test_hub; added requirement to update registry when modifying skills.
- 2026-02-06: Added `sync-test-docs` skill to rules_test_hub for preventing docs-test drift.
# AI Rules Modules (Entry Guide)

## Purpose

This folder splits governance rules into focused modules so AI can load only what it needs for a given task.

This file (`docs/ai/README.md`) is the canonical AI rules **entrypoint** referenced by NOTE prefaces across the repo.

## How to choose modules

Always read (in order):

- `docs/ai/README.md` (entrypoint)
- `docs/ai/rules_core/README.md` (always-on core invariants)
- `docs/foundation/README.md` (constraints + architecture + flows)

Then choose additional modules by task:

- Docs / design / mockups / DSL (Markdown, YAML, HTML, SVG)
  - Read `docs/ai/rules_docs/README.md`
  - Read `docs/ai/rules_test_hub/README.md` (testing tables + tests.md indexes)

- Hub/app code (GameRoom shell, HomePage, shared UI, persistence, networking)
  - Read `docs/ai/rules_code_hub/README.md`

- Game code (per-game adapters, event schemas, projections, game renderer/effects)
  - Read `docs/ai/rules_code_game/README.md`

## Quick routing table

| Task | Must read | Also read |
|------|----------|----------|
| Update a feature design doc or mockup | `docs/ai/README.md`, `docs/ai/rules_core/README.md` | `docs/ai/rules_docs/README.md` |
| Update UI shell behavior (Settings, chat filter, layout) | `docs/ai/README.md`, `docs/ai/rules_core/README.md` | `docs/ai/rules_docs/README.md`, `docs/ai/rules_code_hub/README.md` |
| Add a new game event type + mapping | `docs/ai/README.md`, `docs/ai/rules_core/README.md` | `docs/ai/rules_code_game/README.md` (+ `docs/ai/rules_docs/README.md` if UX changes) |
| Refactor shared utilities/types | `docs/ai/README.md`, `docs/ai/rules_core/README.md` | `docs/ai/rules_code_hub/README.md` |

## Notes

- Keep `docs/ai/README.md` short: it should be easy to scan.
- Put detailed checklists/templates in the modules.
- Skills (automation implementations) live in the rule module folders under `docs/ai/<rule>/skills` and are referenced from the rules docs (see `rules_test_hub` and `rules_core` for examples).

## How to write rules

When adding a new rule module:

1. Create a new folder `docs/ai/rules_<name>/` with a `README.md` file.
2. The README must start with the preface: `NOTE: AI must read docs/ai/README.md before modifying this file.`
3. Include `Version:`, `Changelog:`, H1 title, and sections describing scope, requirements, and examples.
4. Add the new rule to the routing table above if applicable.
5. **Mandatory: Add skills** - Create automation skills under `docs/ai/rules_<name>/skills/` for enforcing the rule (e.g., validation, scanning, fixing). Reference them in the README.

When modifying existing rules:

- Update `Version:` and append to `Changelog:`.
- If adding new requirements, consider adding corresponding skills for automation.
- **Mandatory: Update the Available Skills Registry** in this file (`docs/ai/README.md`) whenever adding, removing, or modifying skills to keep the registry current.

## Skills requirement

Every rule module must have at least one skill for automation. Skills enable:

- Validation (check compliance)
- Scanning (find violations)
- Fixing (auto-correct where safe)
- Reporting (generate summaries)

Skills are colocated in `docs/ai/<rule>/skills/` and include:
- `manifest.json` (description, parameters)
- `handler.ts` (implementation)
- `handler.test.ts` (tests)
- `README.md` (usage)

## Available Skills Registry

This registry lists all available automation skills across rule modules for quick reference.

### rules_docs
- **check-preface**: Check that design/mockup/DSL files have the required preface instructing AI to read docs/ai/README.md
- **scan-contradictions**: Scan for contradictions in related design documents
- **validate-coverage**: Validate that feature design docs have required Coverage Checklists

### rules_code_hub
- **check-conventions**: Check TypeScript/React conventions in hub code
- **validate-types**: Validate TypeScript types for public interfaces

### rules_code_game
- **validate-projections**: Validate that game code emits only allowed room-level projections
- **check-schema**: Check that domain events have required schemaVersion and namespacing

### rules_checklists
- **run-checklist**: Validates checklists by running through each item and reporting compliance status

### rules_core
- **propose-ambiguity-resolution**: When a requirement is ambiguous, generate a concise A/B/C options list with pros/cons and a single clarifying question to the user.

### rules_test_hub
- **enforce-test-comments**: Validate and standardize test header comments to the repo policy (Tests: + Steps: numbered lines) and optionally insert inline `// Step N)` markers.
- **run-unit-tests**: Run the repository's unit test suite (Vitest) for targeted files or the whole suite and report results.
- **sweep-tests**: Sweep repository for test files and normalize test headers according to `enforce-test-comments` plus produce a report of remaining non-conforming files.
- **sync-test-docs**: Scan test files and verify/update corresponding design docs' Testing tables to prevent coverage drift (proposed skill).
