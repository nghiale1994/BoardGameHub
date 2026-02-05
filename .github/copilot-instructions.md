NOTE: You are GitHub Copilot (GPT-5.2). Before making any non-trivial change, read the AI rules entrypoint: `docs/ai/README.md`.

Purpose
- This file is the repo-level entrypoint for Copilot.
- Detailed governance lives in `docs/ai/*`.

Always do (for any task)
- Read (in order):
  - `docs/ai/README.md`
  - `docs/ai/rules_core/README.md`
  - `docs/foundation/README.md`
- If the change touches a feature, read its canonical design: `docs/features/<Feature>/design.md`.
- Keep code, docs, and mockups in sync; do not let artifacts drift.

Routing
- Docs / design / mockups / DSL changes: also read `docs/ai/rules_docs/README.md`.
- Hub/app UI shell changes: also read `docs/ai/rules_code_hub/README.md`.
- Game implementation changes: also read `docs/ai/rules_code_game/README.md`.

Hard gates
- If a feature `design.md` has a Coverage Checklist and any row is ❌, STOP and ask.
- If requirements are ambiguous (Option A/B), STOP and ask before coding.
- Do not introduce new mechanisms/layers without explicit user approval.

When editing governance/design docs
- Follow the repo pattern: keep `NOTE`, update `Version: YYYY-MM-DD`, append to `Changelog:`.

Validation (when applicable)
- Prefer quick verification for touched areas (build/tests). For the frontend app: `cd app` then run `npm run build` and/or `npm test`.
