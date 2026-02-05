NOTE: AI must read docs/ai/README.md before modifying this file.

Version: 2026-02-05

Changelog:
- 2026-02-05: Moved `rules_core.md` into module folder and added Skills listing with manifests in `docs/ai/rules_core/skills`.
- 2026-02-05: Completed migration: legacy `docs/ai/rules_core.md` removed; this `README.md` is now canonical. Please update any references to the module to `docs/ai/rules_core/README.md`.

# Core AI Rules (Always-on)

> Canonical location for this rule module. If you are looking for the previous `rules_core.md`, it has been moved here and renamed to `README.md`.

## Skills (automation)

- `propose-ambiguity-resolution` — manifest: `docs/ai/rules_core/skills/propose-ambiguity-resolution/manifest.json` (handler: `.../handler.ts`) ❓

Usage notes:
- Use the `propose-ambiguity-resolution` skill when a requirement or doc text is ambiguous. It will propose A/B/C options and a direct clarifying question to unblock decisions.

## Scope

Applies to **all tasks** (docs, mockups, hub code, game code).

## 1) Read first, act second

Before generating code or making non-trivial edits:

- Follow **Always read** in `docs/ai/README.md`.
- Then read the relevant canonical design doc(s):
  - Feature canonical: `docs/features/<Feature>/design.md`

## 2) No new mechanisms without explicit approval

AI must not introduce new layers/mechanisms unless the user explicitly approves.

If a new mechanism seems necessary, STOP and present:

- Goal
- Why existing constraints don’t support it
- Proposed mechanism
- Why it’s necessary
- Ask for approval

## 3) Ambiguity guardrails (required)

Trigger words: "or / hoặc / may / can / either / optional" in a behavioral requirement.

When triggered:

- Add an **Ambiguity** section before coding.
- List Option A/B (and C if needed), pros/cons.
- Ask one direct question for the user to choose.

Approval gate:

- If ambiguity is unresolved, code changes are **blocked**.

## 4) Consistency and anti-drift

- Canonical source per feature is `docs/features/<Feature>/design.md`.
- If editing any design artifact (Markdown/YAML/HTML/SVG/mockups), ensure related artifacts stay consistent.

## 5) Versioning and changelog

For any meaningful change to a design/governance doc:

- Update `Version: YYYY-MM-DD` at the top.
- Append a dated bullet in `Changelog:`.

## 6) Deliverable definition

AI must not claim completion unless:

- Required gates are satisfied (e.g., coverage checklist if applicable).
- There are no known missing artifacts referenced by docs.

## 7) When uncertain

Ask; don’t assume.

Prefer 1–3 precise questions over guessing.

## Automation Skills (core)

- `docs/ai/rules_core/skills/propose-ambiguity-resolution/manifest.json` — when ambiguity is detected, propose concise options (A/B/C) with pros/cons and a single clarifying question to unblock.  Use this skill to generate draft options for reviewer choice.


(Original header & changelog archived from legacy file.)
