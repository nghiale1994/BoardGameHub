NOTE: AI must read docs/ai/README.md before modifying this file.
Version: 2026-02-03
Changelog:
- 2026-02-03: Created Casting Shadows test index (Unit/Integration/E2E tables).
- 2026-02-04: Renamed Testing column to "Test Steps" and rewrote steps as short procedures.

# Casting Shadows Tests (Index)

This file aggregates proposed tests for the Casting Shadows game docs and eventual implementation.

Related docs:
- `docs/games/castingShadows/design.md`
- `docs/games/castingShadows/IMPLEMENTATION.md`

## Unit tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| Turn engine (host logic) | Phase progression (phase1 → phase2 → phase3) | Proposed: simulate turn reducer → apply phase events in order → assert phase advances and AP constraints | Turn advances correctly; AP counts enforced |
| Resource system | Dice roll → resource pool → cleanup | Proposed: apply dice roll events → assert resource pool updates → apply cleanup → assert cursed damage rules | Resources added/removed per rules; cursed damage applied |
| Spell resolution | Attack/conversion spells apply correct effects | Proposed: apply spell events with fixtures → assert state deltas match spell definitions | Damage/transform results match spell definitions |

## Integration tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| Multiplayer turn order | 3–4 players, verify turn rotation | Proposed: simulate 3–4 peers → dispatch turn-end events → assert rotation and only active player accepts actions | Turn order correct; only active player can act |
| Counterspell resolution | Trigger ordering and single-trigger-per-turn rule | Proposed: simulate conflicting triggers → resolve in order → assert single-trigger-per-turn invariant | Counterspells resolve in turn order; constraints enforced |

## E2E tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| Full match smoke | Play a short match to elimination | Proposed: run Playwright → create room → play minimal scripted match to elimination → assert winner and no crashes | Basic gameplay works; winner declared; no crashes |
