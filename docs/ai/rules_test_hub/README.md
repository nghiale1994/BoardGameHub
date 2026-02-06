NOTE: AI must read docs/ai/README.md before modifying this file.

Version: 2026-02-06

Changelog:
- 2026-02-05: Moved `rules_test_hub.md` into module folder and added Skills listing with manifests in `docs/ai/rules_test_hub/skills`.
- 2026-02-05: Completed migration: legacy `docs/ai/rules_test_hub.md` removed; this `README.md` is now canonical. Please update any references to the module to `docs/ai/rules_test_hub/README.md`.
- 2026-02-06: Added explicit Change control rules for test additions/removals with hard violation enforcement.
- 2026-02-06: Added proposed `sync-test-docs` automation skill to prevent docs-test drift.

# Hub Testing Docs Rules (AI)

> Canonical location for this rule module. If you are looking for the previous `rules_test_hub.md`, it has been moved here and renamed to `README.md`.

## Skills (automation)

These skills implement or support enforcement of the Hub Testing rules. They are colocated under `docs/ai/rules_test_hub/skills/`.

- `enforce-test-comments` — manifest: `docs/ai/rules_test_hub/skills/enforce-test-comments/manifest.json` (handler: `.../handler.ts`) ✅
- `sweep-tests` — manifest: `docs/ai/rules_test_hub/skills/sweep-tests/manifest.json` (handler: `.../handler.ts`) 🧹
- `run-unit-tests` — manifest: `docs/ai/rules_test_hub/skills/run-unit-tests/manifest.json` (handler: `.../handler.ts`) 🧪

Usage notes:
- Run `sweep-tests` in dry-run mode first to review proposed changes. If fixes are applied, run `run-unit-tests` on modified files and follow failure triage rules in this doc.
- All automation must follow the safety guidelines in `docs/ai/rules_core/README.md` (permissions, dry-run, preview, CI gating).

## Purpose

Prevent test coverage documentation from drifting as features and components evolve.

This module defines how test coverage must be documented across the Hub (HomePage/GameRoom/shared UI) and related design docs.

## Scope

Applies when editing or adding design/spec docs under:

- `docs/features/**`
- `docs/components/**`
- `docs/foundation/**`
- `docs/architecture/**`
- `docs/games/**` (game docs, if the change impacts gameplay rules/implementation guidance)

## Required artifacts

### 1) Per-doc Testing section (required)

Every design/spec doc must include a `## Testing` section containing:

- `### Unit tests` table
- `### Integration tests` table
- `### E2E tests` table

Each table must have these columns:

| Component | Purpose / Context | Test Steps | Expected Result |

Rules:

- `Test Steps` must describe the **short, ordered procedure** (the key actions/events), not the testing framework/method.
- If a test is **skipped** (conditionally or unconditionally), the doc must explicitly say:
  - What is skipped
  - Where it is skipped (test file)
  - Why (technical constraint)
- If a level is not applicable or not currently possible (e.g. no E2E harness), include at least **one row** explaining why in the `Test Steps` and/or `Expected Result` fields.
- It is acceptable to mark tests as **proposed** (documentation-only) when the harness is not in place. Do not claim they exist unless implemented.

Failure reporting requirement (for AI/agent work):

- When a test run fails, the agent must report:
  - The failing test name(s)
  - The short procedure up to the failing step (from `Test Steps`, plus the observed vs expected at the failure point)
  - The likely technical cause (e.g. timing/hydration, signaling disconnect, environment mismatch, assertion bug)

## In-code test authoring rules (mandatory)

Applies to **all test files** (unit/integration/E2E).

### 1) Per-test intent comment (required)

Before each `test("...", ...)` / `it("...", ...)`, add a short comment that states:

- What behavior is being tested
- The short ordered steps/events (compact but complete)
- Any relevant spec qualifiers (browser/layout/breakpoint/network mode)

Format requirements:

- The comment must be **at least 2 lines**: one `Tests:` line and one `Steps:` header line.
- Under `Steps:`, each step must be on its **own line** and **numbered**.
- Keep steps short; they should map directly to meaningful user/actions/assert milestones.

Example shape:

```ts
// Tests: host+peer chat sync.
// Steps:
// 1) host creates room
// 2) peer joins
// 3) both open chat
// 4) exchange messages
// 5) assert no unread badge
test("...", async () => {
  // Step 1) host creates room
  // Step 2) peer joins
  // Step 3) both open chat
  // Step 4) exchange messages
  // Step 5) assert no unread badge
});
```

Inline step markers (required):

- When the test body performs an action/assert that corresponds to a declared `Steps:` line, add an inline `// Step N) ...` comment immediately before that action/assert.
- The inline `Step N)` text should match the corresponding step description closely (same verb/object).

### 2) Action logging (required)

All meaningful actions in a test must be logged to the console so runs are diagnosable without screenshots:

- E2E: log each user action (goto/click/fill/close/open tab) and each expected milestone (connected, joined, badge count).
- Unit/integration: log each major step (setup → act → assert), especially when data is generated or simulated.

Preferred pattern:

- Use a helper like `markBehavior(page, label, step)` in Playwright specs.
- Use `console.log("[test] ...")` in unit/integration where no page is available.

### 3) Failure triage: repeat before changing code (required)

When a test fails during agent work:

1. Re-run the **same failing test case** up to **3 times** (no code changes).
2. If it passes intermittently, treat it as flake: improve logging/awaits and re-run 3 times again.
3. Only after it fails consistently (3/3) should code changes be proposed/applied.

Suggested commands:

- Playwright (repeat deterministically):
  - `npx playwright test <file> --grep "<test name>" --workers=1 --repeat-each=3`
- Vitest:
  - `npx vitest run <file> --repeat 3` (or re-run the file 3 times if repeat flag is unavailable)

### 2) Per-folder `tests.md` index (required)

Each major documentation folder must contain a `tests.md` that aggregates tests in that folder using the same table format.

When updating a doc in a folder, update that folder's `tests.md` accordingly.

## Consistency rules

- The folder-level `tests.md` must stay consistent with individual docs.
- Feature canonical sources remain:
  - `docs/features/<Feature>/design.md`
- If a feature has a Coverage Checklist, the checklist gate remains in force (see `docs/ai/rules_docs/README.md`).

## Change control

When you add/remove behaviors or requirements in a design doc:

1. Update the doc's `## Testing` tables.
2. Update the folder `tests.md` index.
3. Update `Version:` and append a dated bullet to `Changelog:`.

**When you add/remove/modify tests in code:**

1. Immediately update the corresponding design doc's `## Testing` tables to reflect new coverage.
2. Update the folder `tests.md` index if applicable.
3. Update `Version:` and append a dated bullet to `Changelog:` in the affected docs.
4. Run `sync-test-docs` skill (proposed) to auto-verify sync status.

**Failure to sync docs with test changes is a hard violation** — do not proceed with other tasks until docs are updated.

## Automation Skills

The repository provides automation skills that implement or help enforce these rules. Skills are colocated with the rule modules in `docs/ai/<rule>/skills`.

Current skills for this module:

- `docs/ai/rules_test_hub/skills/enforce-test-comments/manifest.json` — enforce per-test `Tests:`/`Steps:` headers and insert inline `// Step N)` markers.
- `docs/ai/rules_test_hub/skills/sweep-tests/manifest.json` — scan the repo for non-conforming tests and optionally auto-fix.
- `docs/ai/rules_test_hub/skills/run-unit-tests/manifest.json` — run Vitest unit tests (targeted files or full suite) and report results.
- `docs/ai/rules_test_hub/skills/sync-test-docs/manifest.json` — scan test files and verify/update corresponding design docs' Testing tables (proposed skill).

Usage guidance:
- Run `sweep-tests` in `dry-run` to get a report before applying fixes.
- After applying fixes, always run `run-unit-tests` on the modified files and follow the failure triage rules.
- Use `sync-test-docs` after adding/removing tests to auto-verify docs are in sync.
