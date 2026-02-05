NOTE: AI must read docs/ai/README.md before modifying this file.
Version: 2026-02-04
Changelog:
- 2026-02-03: Created foundation test index (Unit/Integration/E2E tables).
- 2026-02-04: Linked implemented unit tests (identity/presence/epoch + persistence + invite helpers).
- 2026-02-04: Renamed Testing column to "Test Steps" and linked implemented PeerJS integration/E2E coverage.
- 2026-02-04: Documented PeerJS E2E conditional skips (PeerJS-disabled runs and WebKit-on-Windows).

# Foundation Tests (Index)

This file aggregates proposed tests for repo-wide foundations (constraints/architecture/flows/peerjs).

Canonical sources:
- `docs/foundation/constraints.md`
- `docs/foundation/architecture.md`
- `docs/foundation/flows.md`
- `docs/foundation/peerjs.md`

## Unit tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| Identity | `clientId` persistence across remounts | Run `app/src/hooks/useRoomContext.foundation.test.ts` → mount/unmount hook → assert `clientId` restored from storage | Stable identity across refresh/remount |
| Presence | Status thresholds and keyed by `clientId` | Run `app/src/services/presence.test.ts` → compute statuses from lastSeen map → assert thresholds + clientId-keyed output | Statuses correct; no peerId-based ghost rows |
| Takeover epoch | Ignore old-host messages by `hostEpoch` | In foundation hook test: emit envelopes with older/newer hostEpoch → assert older ignored and newer applied | Old epochs ignored; new epoch accepted |
| Preferences broadcast | `BroadcastChannel` publishes pref updates | Run `app/src/services/persistence.test.ts` → subscribe → set preference → assert subscriber receives update | Subscribers notified on preference changes |
| Invite/share helpers | Parse/build invite links and IDs | Run `app/src/services/roomHelpers.test.ts` → parse /i + legacy /r + invalid URLs → assert expected roomId/null | /i and legacy /r links supported; invalid URLs rejected |

## Integration tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| Join + snapshot sync | join_request includes clientId; snapshot consistent | In `app/src/hooks/useRoomContext.integration.test.ts`: connect → send join_request(clientId) → receive room_snapshot → assert metadata uses stable clientId and UI state converges | Joiners converge on host snapshot |
| Takeover + transfer | Race-to-claim + request_state/provide_state | In integration test: host silence → claim peerId=roomId → request_state/provide_state → select best snapshot → broadcast canonical snapshot + presence_update | Peers converge on canonical snapshot |

## E2E tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| PeerJS host migration | Real signaling + WebRTC channels + takeover | Run `npm run test:e2e:peerjs` (auto-starts local signaling + sets `VITE_E2E_DISABLE_PEERJS=0`) → run `app/e2e/host-migration.peerjs.spec.ts`, `app/e2e/host-migration.pair.peerjs.spec.ts`, `app/e2e/host-migration.matrix.peerjs.spec.ts`; Skips: suite skipped unless PeerJS enabled (`test.skip(!isPeerJsEnabledForThisRun(), ...)` in each spec); matrix skips WebKit on Windows (`test.skip(nodePlatform === "win32" && ...includes("webkit"), ...)`) | Room continues; UI converges; no split-brain |
| Multi-tab reliability | Refresh, rejoin, and takeover under real browser | Proposed: multi-page scenario (open 2 tabs same profile) → join/rejoin/refresh loops → assert last-tab-wins identity and no ghost seats | Room continues; UI stable; no split-brain |
