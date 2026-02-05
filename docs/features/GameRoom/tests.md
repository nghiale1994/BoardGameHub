NOTE: AI must read docs/ai/README.md before modifying this file.
Version: 2026-02-04
Changelog:
- 2026-02-03: Created GameRoom test index (Unit/Integration/E2E tables).
- 2026-02-03: Implemented core GameRoom unit/integration/E2E tests and linked to source files.
- 2026-02-03: Implemented mock networking integration tests for join handshake and host takeover.
- 2026-02-04: Implemented PeerJS-backed multi-context host migration E2E test (Chromium + Firefox).
- 2026-02-04: Added PeerJS E2E pair + matrix coverage (cross-browser + cross-layout, bundled behaviors).
- 2026-02-04: Renamed Testing column to "Test Steps" and documented PeerJS E2E local signaling default.
- 2026-02-04: Documented PeerJS E2E conditional skips (PeerJS-disabled runs and WebKit mapped to Chromium cases with duplicates skipped).
- 2026-02-04: Added ChatPanel PeerJS E2E coverage (unread badges) and implemented spectator label + unread badge unit coverage.
- 2026-02-04: Implemented chat message-id dedupe integration coverage.

# GameRoom Tests (Index)

This file aggregates the proposed test coverage for the GameRoom feature.

Canonical design source:
- `docs/features/GameRoom/design.md`

## Unit tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| Presence computation | Status derived from heartbeats keyed by `clientId` | Run `app/src/services/presence.test.ts` → feed heartbeat timestamps keyed by clientId → assert connected/reconnecting/offline thresholds | No peerId churn ghosts; status thresholds respected |
| Host identity | Host badge/role driven by `hostClientId` | Run `app/src/services/roomUiProjection.test.ts` → project UI from metadata+presence → assert host badge follows hostClientId (not peerId) | Host indicators stable across refresh/rejoin |
| HeaderBar | Copy invite link + status indicator mapping | Render GameRoom page (`app/src/components/GameRoomPage.test.tsx`) → click Copy Invite → assert clipboard/toast; set status inputs → assert 🟢/🟡/🔴 mapping | Copy uses invite URL; 🟢/🟡/🔴 mapping correct |
| ParticipantsPanel | Split players/spectators + self marker | Render GameRoom page → provide players+spectators+local clientId → assert split sections + “(me)/(tôi)” marker only on self | Lists correct; self marker only for self clientId |
| ChatPanel | Rendering + filters + move log + spectator label + unread badges | Render GameRoom page with user/move/system messages → toggle chat filter prefs → assert user/move hidden while system remains; render spectator user message → assert `[Spectator] {name}` label; while chat hidden append new user message → assert unread badge increments and opening chat clears it (Coverage: `app/src/components/GameRoomPage.test.tsx`) | Messages render correctly; filters apply; spectator label correct; unread badge increments only when hidden and clears when opened |
| GameBoard | Phase badge mapping | Render GameRoom page → set snapshot phase (setup/playing/finished) → assert phase badge label updates | Phase badge matches phase |

## Integration tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| Join handshake | join_request → room_snapshot → render | In `app/src/hooks/useRoomContext.integration.test.ts`: initialize joiner → connect(roomId) → send join_request → host emits room_snapshot → assert snapshot applied in hook state | Snapshot applies; participant list updates |
| Host disconnect + takeover | Race-to-claim + state transfer + new host presence | In integration test: simulate host silence → non-host claims peerId=roomId → sends request_state → receives provide_state → picks best version → broadcasts room_snapshot + presence_update | New host claims roomId; best snapshot chosen; snapshot + presence broadcast |
| Chat sync dedupe | Dedupe chat messages by `message.id` on resend/reconnect | In `app/src/hooks/useRoomContext.integration.test.ts`: restore joined state → emit duplicate `chat_event` payloads with the same `message.id` → assert hook appends once | Each message appears once in hook state |
| Layout invariants | Scroll behavior and no double-scroll | Render GameRoom page → populate chat list → assert only message list scrolls while composer stays pinned | Only message list scrolls; composer stays visible |
| Settings chat filters | SettingsModal toggles affect ChatPanel | Render App → enter GameRoom → open Settings → toggle Show conversation / Show game events → close modal → assert filtered chat output | conversation/move hidden per toggles; system always visible |

## E2E tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| GameRoom UX | Responsive layout + chat + participants flows | Run `npm run test:e2e` → create/join room → switch breakpoints (desktop/tablet/mobile) → use chat + participants UI → assert per mockups | Matches design + mockups across breakpoints |
| ChatPanel | Host+peer chat sync + unread badge behavior | Run `npm run test:e2e:peerjs` → host creates room → peer joins → exchange messages with chat open (no badge) → close chat on one side → other sends message → assert unread badge increments → open chat → badge resets (Coverage: `app/e2e/chat-panel.peerjs.spec.ts`) | Messages sync; unread badge increments only when hidden and clears when opened |
| Host migration (baseline) | Multi-user takeover behavior (1 host + 3 peers) | Run `npm run test:e2e:peerjs` (auto-starts local PeerJS signaling) → host creates room → 3 peers join → close host tab → assert a peer claims host + others reconnect | A peer becomes host after host closes; others reconnect |
| Host migration (pair) | Host+peer cross-browser takeover + old host return | Run peerjs e2e → chromium host + firefox peer join → close host tab → assert peer takes over → reopen old host → assert it rejoins as peer | Peer becomes host; old host rejoins; room connected |
| Host migration (matrix) | Browser/layout matrix; 5 behaviors bundled per case | Run peerjs e2e matrix → for each browser/layout cell: join wave → bundled leave/close/rejoin events → assert all reach Connected; Skips: suite is skipped unless PeerJS is enabled (`test.skip(!isPeerJsEnabledForThisRun(), ...)` in PeerJS specs). WebKit slots are mapped to Chromium (annotated) and duplicate cases are skipped inside `app/e2e/host-migration.matrix.peerjs.spec.ts` | Covers same/cross browser + same/mixed layouts + leave/close/rejoin behaviors |
