# PeerJS Implementation Notes (BoardGameHub)

> NOTE: AI must read docs/ai/README.md before modifying this file.

Version: 2026-02-04

Changelog:

- 2026-02-02: Added initial PeerJS/WebRTC overview and refresh/reconnect behavior notes.
- 2026-02-03: Canonicalized host migration as race-to-claim + state transfer; removed deterministic takeover option framing.
- 2026-02-03: Clarified presence + recognition are `clientId`-keyed (peerId is transport only), including `hostClientId`.
- 2026-02-03: Reduced duplication with other foundation docs; this file is now implementation details + troubleshooting.
- 2026-02-03: Added Testing section with Unit/Integration/E2E tables.
- 2026-02-04: Documented signaling configuration via env vars; PeerJS E2E defaults to a local-per-run signaling server (hosted override supported).
- 2026-02-04: Updated PeerJS E2E guidance to use local signaling by default for stability; renamed "Test Method" to "Test Steps".
- 2026-02-04: Replaced globbed E2E spec reference with explicit files; documented PeerJS/Windows WebKit skip locations.
- 2026-02-04: Clarified peerId stability invariants (role-locked peerId) to prevent join-wave churn from causing roomId collisions.

## Scope

This doc is a **deep dive** into PeerJS usage and failure modes.

Canonical sources for behavior:

- Constraints: `docs/foundation/constraints.md`
- Flow diagrams: `docs/foundation/flows.md`
- Architecture overview: `docs/foundation/architecture.md`

## Code references

- Networking wrapper: `app/src/services/peerService.ts`
- Room lifecycle + event handling: `app/src/hooks/useRoomContext.ts`
- Room URL helpers: `app/src/services/roomHelpers.ts`

## Signaling server configuration

PeerJS signaling is configured via Vite env vars (see `app/.env.local`):

- `VITE_PEERJS_HOST`
- `VITE_PEERJS_PORT`
- `VITE_PEERJS_PATH`
- `VITE_PEERJS_SECURE`
- `VITE_PEERJS_KEY`

Signaling choice:

- App/dev can use any signaling configured via `.env.local`.
- For automated PeerJS E2E, the repo defaults to a **local** signaling server started per run (more stable than a shared/global server).
  - Runner: `npm run test:e2e:peerjs` (starts `npm run peerjs:server` automatically)
  - Override (optional): set `PEERJS_SIGNALING_URL` to use a hosted server

Rationale: shared hosted signaling is often rate-limited or unstable under join waves, which makes E2E flaky.

## Identity model (transport vs recognition)

The app intentionally separates:

- **Transport identity (`peerId`)**: used only for PeerJS addressing (`connectToPeer(peerId)`). It can change across refresh/rejoin.
- **Recognition identity (`clientId`)**: stable per browser profile; used for seat matching and presence.

Host identity specifics:

- Transport host endpoint is stable: `hostId = roomId`.
- `RoomMetadata.hostClientId` identifies *who the host is* in a stable way for UI/logic.

## Peer id allocation (Option A)

- Host peer id = `roomId`
- Joiner peer id = device-specific id (and can fall back to a new id if reuse is rejected)

Why:

- Share URL stays stable (`/i/<roomId>`).
- Everyone can always attempt `connect(roomId)`.

## Stability invariants (peerId is role-locked)

These invariants are required for stable host migration under real-world signaling hiccups (especially during join waves in E2E):

- **Host peerId lock:** once the host has successfully initialized and reached its first `open`, the host must not intentionally switch away from `peerId = roomId`. If signaling disconnects, it should attempt a signaling reconnect while keeping the same peer id.
- **Joiner peerId lock:** joiners must never initialize PeerJS with `peerId = roomId` during the normal join handshake. Joiners use a device peer id (or a fresh peer id only when reuse is rejected).
- **Takeover gate:** claiming `peerId = roomId` is only permitted once a non-host peer has entered recovery (UI `reconnecting`/`offline`) based on host liveness thresholds. This prevents a joiner from racing the host for `roomId` while the host is still effectively live.

## Message envelope (wire format)

All room messages travel as a single envelope (JSON string on the wire).

```ts
export type PeerEvent = {
  type: string;
  payload: unknown;
  senderId: string;
  timestamp: number;
  roomId: string;
  hostEpoch?: number;
};
```

Implementation notes:

- PeerJS `data` arrives as a string; the networking layer must parse JSON before routing.
- `hostEpoch` is used to reject old-host events after takeover.

## Presence (implementation details)

High-level behavior is documented in the GameRoom design and foundation flows; this section captures the *implementation constraints*.

- Non-host peers send `heartbeat` on a fixed cadence (current code uses ~2s).
- Heartbeat payload includes `clientId`.
- Host tracks `lastSeenAt` by `clientId` and computes statuses:
  - `connected`: lastSeen within ~5s
  - `reconnecting`: lastSeen between ~5s and ~20s
  - `offline`: lastSeen older than ~20s
- Host broadcasts `presence_update` with `statuses` keyed by `clientId`.

Instant reconnecting:

- Host also listens to peer connection lifecycle.
- On connection close/error, host immediately treats that `clientId` as `reconnecting` (no heartbeat wait) and rebroadcasts `presence_update`.

## Refresh/reconnect notes (why “reconnecting” is expected)

PeerJS sessions are runtime-bound:

- A browser refresh destroys the PeerJS instance and all WebRTC channels.
- Until a host (old or new) re-claims `peerId = roomId`, `connect(roomId)` has no endpoint.

So after host refresh:

- Peers will show `reconnecting` first (grace period), then `offline` later.
- If host does not return fast enough, takeover (race-to-claim) may occur.

## Common errors and what they mean

### “Timed out waiting for host snapshot”

Symptoms:

- Joiner connects and sends `join_request` but never receives `room_snapshot`.

Common causes:

- The host is offline or in takeover churn.
- The networking layer failed to parse the incoming JSON string into an envelope (`PeerEvent`).

### “ID is taken / unavailable-id”

Meaning:

- The PeerJS signaling server refuses to allocate the requested `peerId` (often during takeover or after a fast refresh).

Expected behavior:

- For joiners: generate a different peer id and retry join.
- For takeover: keep retrying to claim `peerId = roomId` based on host-down thresholds.

## Manual test scenarios

- Two tabs:
  - Tab A creates room (host).
  - Tab B joins via invite.
  - Verify B receives `room_snapshot` within ~10s.
- Host refresh:
  - While B is connected, refresh A.
  - Verify B switches to reconnecting.
  - Verify either A returns and resumes host, or takeover occurs and room continues.

## Testing

### Unit tests

| Component | Purpose / Context | Test Steps | Expected Result |
| --- | --- | --- | --- |
| PeerService init | Retry/backoff and unavailable-id handling | Proposed: stub PeerJS init failures → assert only unavailable-id triggers peerId fallback and no tight infinite retries | Unavailable-id triggers controlled retry/fallback; no infinite tight loop |
| Envelope parsing | JSON parsing and routing by `type` | Proposed: feed valid/invalid JSON strings → assert invalid dropped and valid routed to listeners | Invalid ignored safely; valid routed correctly |

### Integration tests

| Component | Purpose / Context | Test Steps | Expected Result |
| --- | --- | --- | --- |
| Joiner happy path | Connect(roomId) → join_request → room_snapshot | In `app/src/hooks/useRoomContext.integration.test.ts`: connect → send join_request → host emits room_snapshot → assert snapshot applied and presence starts | Snapshot received; UI updates; presence starts |
| Takeover churn resistance | Host-down detection based on presence, not ghost conns | In integration test: simulate ghost/stale conns but no presence_update → assert host-down triggers takeover and state converges | Takeover triggers correctly; no stuck reconnecting state |

### E2E tests

| Component | Purpose / Context | Test Steps | Expected Result |
| --- | --- | --- | --- |
| Host migration (baseline/pair/matrix) | Real signaling + WebRTC channels + takeover | Run `npm run test:e2e:peerjs` (auto-starts local signaling + sets `VITE_E2E_DISABLE_PEERJS=0`) → execute `app/e2e/host-migration.peerjs.spec.ts`, `app/e2e/host-migration.pair.peerjs.spec.ts`, `app/e2e/host-migration.matrix.peerjs.spec.ts`; Skips: all 3 specs call `test.skip(!isPeerJsEnabledForThisRun(), ...)` when PeerJS is disabled; matrix also skips WebKit on Windows via `test.skip(nodePlatform === "win32" && ...includes("webkit"), ...)` | Scenarios reproducible and stable |
