NOTE: AI must read docs/ai/README.md before modifying this file.
Version: 2026-02-04
Changelog:
- 2026-02-03: Created architecture test index (Unit/Integration/E2E tables).
- 2026-02-04: Linked existing chat filter integration coverage to implemented hub tests.
- 2026-02-04: Renamed Testing column to "Test Steps" and clarified proposed vs implemented coverage.

# Architecture Tests (Index)

This file aggregates proposed tests for architecture designs under `docs/architecture/`.

## Unit tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| Event envelope validation | Ensure envelope has required fields | Proposed: add unit tests → feed missing/invalid `{type,senderId,roomId,timestamp,hostEpoch}` → assert dropped safely | Invalid envelopes rejected safely |
| Adapter mapping | Domain event → UI projections mapping | Proposed: add unit tests with fixtures → map known/unknown domain events → assert stable projections and unknown fallback | Stable projections; fallback for unknown events |

## Integration tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| Chat filters | conversation/gameEvent/system rendering invariants | Run `app/src/components/GameRoomPage.test.tsx` + `app/src/App.gameroom.test.tsx` → render mixed messages → toggle filters → assert AND logic + system always visible | Filters behave correctly across message types |

## E2E tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| New game onboarding | Adding a new game does not regress hub UI | Proposed: run Playwright → add a new game entry → navigate Home/GameRoom flows → assert unknown event types do not crash | Unknown event types do not crash UI |
