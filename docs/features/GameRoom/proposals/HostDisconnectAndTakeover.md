# HostDisconnectAndTakeover Proposal

> NOTE: AI must read docs/ai/README.md before modifying this file.

<!-- markdownlint-disable MD022 MD032 MD031 MD040 MD060 -->

Version: 2026-02-04
Changelog:
- 2026-02-02: Initial proposal capturing two approaches (A/B) for host-down detection and takeover, with preference for using `presence_update` as liveness.
- 2026-02-02: Added "host must be down for all peers" takeover guard discussion and clarified fixed vs adaptive `presence_update` cadence.
- 2026-02-03: Replaced deterministic-election examples with the current "race-to-claim" implementation notes; removed epoch-vote table example.
- 2026-02-03: Documented why `roomId` reclaim timing is not guaranteed (server-side) and clarified the only strict minimums (earliest attempt time).
- 2026-02-03: Canonicalized the proposal as race-to-claim + state transfer; removed deterministic target section.
- 2026-02-03: Standardized Testing section into Unit/Integration/E2E tables.
- 2026-02-04: Renamed Testing tables column to "Test Steps" and rewrote entries as ordered procedures.

## Purpose
Describe the host-down detection and takeover behavior used by the current implementation (race-to-claim + state transfer), including key constraints around `roomId` reclaim timing.

## Problem
Observed behavior (3 people: host, peer1, peer2):
- Host closes browser.
- peer1/peer2 stay in **Connected** state for a long time.
- No peer takes over as host.

## Status (Important)

- The current Hub implementation has moved away from "wait for PeerJS teardown" and uses host liveness (`presence_update`) instead.
- The current takeover behavior is **race-to-claim** (non-deterministic): multiple peers may attempt to claim `peerId = roomId` until one succeeds.
- The canonical host migration behavior is **race-to-claim + state transfer** (see foundation docs).

## Root Cause
Deriving room connection health from "do I have *any* PeerJS connections" is not reliable:

- WebRTC/PeerJS can keep connections open for a while after the host disappears.
- That can keep UI in **Connected**, blocking recovery flows.

## Design Goals
- Peers should detect host-down within a predictable window (seconds, not minutes).
- Takeover should not depend on PeerJS automatically closing connections.
- Must remain compatible with:
  - Host endpoint = stable `peerId = roomId`
  - `hostEpoch` guard to reduce split-brain risk
  - Old host returns must join as a normal peer if `roomId` is already claimed

## `roomId` reclaim timing (important constraint)

Even with perfect consensus, a peer cannot always reclaim `peerId = roomId` immediately after the host closes the browser.

### Why it is not guaranteed
- `peerId` ownership is controlled by the **PeerJS signaling server**.
- When the host tab closes, the server may keep the old peer session “alive” until it detects the disconnect (server heartbeat/ping/timeout).
- With the project constraint of **frontend-only**, we do not control the PeerJS server timeouts (unless we introduce a self-hosted server, which is out of scope).

### What minimum time can we state?

There are two separate clocks:

1) **Earliest time we attempt to claim `roomId`** (app-controlled)
   - This is deterministic and is at least:
     - `TAKEOVER_AFTER_MS` (host-down threshold), plus
     - any additional consensus/coordination delay (if using an “all peers agree” rule).
   - If consensus is reached at time `T_consensus`, the winner can attempt to claim immediately at `T_consensus`.
   - Therefore the strict minimum for the *attempt* is:
     - **0 seconds after consensus**, and **`TAKEOVER_AFTER_MS` after last host liveness**.

2) **Earliest time the claim succeeds** (server-controlled)
   - This depends on when the signaling server releases the old peer id.
   - We cannot guarantee a fixed number of seconds across networks/servers.

### Practical behavior (current implementation)
- When host is suspected down, peers periodically attempt to claim `peerId = roomId`.
- If a claim fails because the id is still taken, the peer retries later.

This makes recovery as fast as the signaling server allows, but may be noisier than a deterministic single-winner approach.

## Current Implementation (Race-to-claim)

### Host liveness signal
The host broadcasts `presence_update` on a fixed cadence.

Each peer tracks a timestamp `lastHostSignalAt` and updates it when:

- receiving `room_snapshot`, or
- receiving a `presence_update` whose `senderId === roomId`.

### Connection status derivation
Non-host peers derive room health from host liveness:

- `connected` when host signal is recent
- `reconnecting` when host signal is stale but not fully offline
- `offline` when host signal is very old

### Recovery loop
When not connected, a non-host peer periodically:

1) tries to reconnect to the stable endpoint (`connect(roomId)` + `join_request`)
2) also tries to claim the stable endpoint (`initialize(roomId)`) to become host

This alternates on a short cadence so that once the PeerJS server releases `roomId`, one peer can successfully claim it.

### Becoming host
If a peer successfully claims `peerId = roomId`:

- it updates room metadata to set `hostId = roomId`
- it increments `hostEpoch`
- it begins broadcasting host liveness (`presence_update`) as `senderId = roomId`
- it requests state from remaining peers (`request_state`) and selects the best received snapshot (`provide_state`), then broadcasts a canonical `room_snapshot`

Other peers recognize the new host by receiving `presence_update` from `senderId === roomId`.

### Scope / Non-goals
- No deterministic election: winners are decided by the signaling server granting the `roomId` claim.
- No separate `host_announce`: peers converge based on `presence_update` from `senderId === roomId` and canonical `room_snapshot` broadcasts.

### Pros
- Minimal changes; uses existing `presence_update`.
- Predictable “host-down detection” window.
- Avoids relying on PeerJS connection teardown.
- State transfer reduces snapshot regressions when the winner is not the most up-to-date peer.

### Cons / Risks
- If the host is overloaded or temporarily unable to broadcast `presence_update`, peers may falsely trigger reconnect/takeover.
- Requires careful guarding with `hostEpoch` to avoid split-brain.

## Recommendation

- Keep race-to-claim + state transfer as the canonical approach.
- Improve robustness by tuning:
  - `presence_update` cadence and thresholds
  - retry/backoff for claim attempts
  - snapshot selection criteria (today: highest `version`)

## Testing

### Unit tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| Host liveness derivation | `lastHostSignalAt` updates only from host signals | Feed envelopes with different senderId; assert only `senderId === roomId` updates host liveness (Coverage: `app/src/services/presence.test.ts` and/or room context tests as applicable) | Only `senderId === roomId` presence_update updates host liveness |
| Takeover gating | Host-down threshold triggers recovery loop | Advance time past threshold without host signal; assert recovery loop begins (Proposed; not yet implemented in repo) | Recovery loop starts only after configured thresholds |

### Integration tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| 3-peer room takeover | Host closes → peers recover within window | Integration (simulated peers): stop host signals | Peers show reconnecting; one peer claims roomId and becomes host |
| State transfer | New host requests snapshots and selects best | Integration: provide multiple snapshots with versions | Highest-version snapshot becomes canonical room_snapshot |
| Old host return | Returning host joins as peer (no reclaim) | Integration: attempt to init with roomId after takeover | Unavailable-id causes fallback join; no split-brain |

### E2E tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| Host tab close | Real browser close triggers reconnecting quickly | E2E (Playwright multi-page) — proposed; not yet implemented in repo | UI transitions to reconnecting within threshold |
| Epoch correctness | Peers ignore older hostEpoch after takeover | E2E — proposed | No old-host events applied; room converges |

## Open Questions

- What exact thresholds should we use for `connected/reconnecting/offline` derivation?
- Should host `presence_update` cadence be fixed or adaptive?
