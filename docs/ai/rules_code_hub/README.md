NOTE: AI must read docs/ai/README.md before modifying this file.

Version: 2026-02-01

Changelog:
- 2026-02-01: Extracted hub/app (shared UI) coding rules.
- 2026-02-05: Moved `rules_code_hub.md` into module folder and created this `README.md` as canonical location.

# Hub Code Rules (App Shell)

> Canonical module for Hub/app coding rules.

## Skills (automation)

- `check-conventions`: Validates TypeScript/React conventions.
- `validate-types`: Checks explicit types on public interfaces.

Skills are located under `docs/ai/rules_code_hub/skills/`.

---

(Original content follows)

NOTE: AI must read docs/ai/README.md before modifying this file.

Version: 2026-02-01

Changelog:
- 2026-02-01: Extracted hub/app (shared UI) coding rules.

# Hub Code Rules (App Shell)

## Scope

Applies to shared application code (HomePage/GameRoom shell/shared components), including:

- UI composition
- Persistence (localStorage/IndexedDB wrappers)
- Networking layer and room flows
- Shared state management

## 1) Follow PROJECT_CONSTRAINTS

Host-authority, event flows, and persistence rules must align with `docs/foundation/constraints.md`.

## 2) No hidden coupling to game modules

- Hub/UI must not depend on per-game payload details.
- Hub consumes normalized **room-level projections** and renders them.

## 3) Testing expectations

- Core reducers/state transitions should have unit tests.
- UI behavior should have at least a manual test scenario documented.

## 4) TypeScript/React conventions

- Prefer explicit types for public interfaces.
- Keep components small and compositional.
- Avoid introducing new state layers without approval.

## 5) Persistence keys and backward compatibility

- If changing persisted structures, document migration or defaults.
- Prefer additive changes.