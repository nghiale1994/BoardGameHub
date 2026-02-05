# GameRoom Design

> NOTE: AI must read docs/ai/README.md before modifying this file.

<!-- markdownlint-disable MD022 MD032 MD031 MD040 MD060 -->

Version: 2026-02-04
Changelog:
- 2026-01-31: Clean rewrite - removed platform references, fixed language issues, organized structure.
- 2026-01-31: Added move log messages into Chat (actor/action/time) and added Coverage Checklist + component doc structure.
- 2026-01-31: Added Settings modal (language selection, theme toggle, chat settings) and chat filtering behavior.
- 2026-02-01: Tablet layout standardized to Board fixed + right side sheet (tabs: Participants/Chat).
- 2026-02-01: Desktop/PC now uses Tablet layout; removed 3-column desktop layout.
- 2026-02-02: Documented host-authoritative chat sync + participant presence mechanism (heartbeat + instant reconnecting on connection changes).
- 2026-02-02: Copy invite link shows toast confirmation.
- 2026-02-02: Added unread chat badges (mobile button + PC/Tablet chat tab), changed VI Participants label to "Thành viên", and clarified participants tab count label.
- 2026-02-02: Clarified chat scrolling: message list scrolls independently (input remains visible).
- 2026-02-02: PC/Tablet chat sizing: side sheet fills available height; message list scrolls in remaining space; composer pinned.
- 2026-02-02: Participants list shows a self marker suffix: "(tôi)/(me)".
- 2026-02-02: Documented refresh behavior on `/room/:roomId` (auto-rejoin, host restore fallback, and no redirect-to-Home on join failure).
- 2026-02-02: Added proposal link for host-down detection + takeover (Approach A/B).
- 2026-02-03: Documented stable `clientId` identity for rejoin seat matching; updated takeover notes to race-to-claim canonical.
- 2026-02-03: Clarified current UI self/role derivation uses `clientId`; linked Direction (B) UI projections as the future path for game/event implementation.
- 2026-02-03: Clarified presence computation + `presence_update` are keyed by stable `clientId` (peerId is transport only).
- 2026-02-03: Standardized Testing section into Unit/Integration/E2E tables.
- 2026-02-03: Implemented GameRoom core unit/integration tests and Playwright GameRoom UX E2E coverage.
- 2026-02-03: Implemented mock networking integration tests for join handshake and host takeover.
- 2026-02-04: Implemented PeerJS-backed multi-context host migration E2E test (Chromium + Firefox).
- 2026-02-04: Updated PeerJS host-migration E2E runner to start a local signaling server per run by default (hosted override supported).
- 2026-02-04: Added PeerJS E2E pair + matrix coverage (cross-browser + cross-layout, bundled behaviors).
- 2026-02-04: Renamed Testing tables column to "Test Steps" and rewrote entries as ordered procedures.
- 2026-02-04: Documented PeerJS E2E conditional skips (PeerJS-disabled runs and WebKit mapped to Chromium cases with duplicates skipped).
- 2026-02-04: Clarified peerId stability invariants (host keeps roomId; peers only claim roomId after reconnecting/offline) for PeerJS host-migration reliability.

## Purpose
Provide the primary in-room experience for multiplayer board games, supporting both active players and spectators.

## Feature Canonical Source
This file (`design.md`) is the canonical design source for the **GameRoom** feature. Any other GameRoom docs (component specs, DSL/YAML, and HTML mockups) must align with this.

## Coverage Checklist (Required)
This checklist is the anti-drift gate for the GameRoom feature.

Legend: ✅ implemented in GameRoom mockup, ↗ covered elsewhere, ❌ missing

| Area | Behavior | Spec | Mockup | Status |
|------|----------|------|--------|--------|
| Layout | Desktop/PC + Tablet: Board fixed + right side sheet with tabs (Participants/Chat) | This file | [GAMEROOM_MOCKUP.html](GAMEROOM_MOCKUP.html) | ✅ |
| Layout | Mobile: floating chat button + bottom sheet participants | This file | [GAMEROOM_MOCKUP.html](GAMEROOM_MOCKUP.html) | ✅ |
| Participants | Players list + spectators list + role toggle constraints | [ParticipantsPanel.md](Participants/ParticipantsPanel.md) | [GAMEROOM_MOCKUP.html](GAMEROOM_MOCKUP.html) | ✅ |
| Chat | User messages + spectator label + system join/leave/role messages | [ChatPanel.md](Chat/ChatPanel.md) | [GAMEROOM_MOCKUP.html](GAMEROOM_MOCKUP.html) | ✅ |
| Chat | Move log messages from game (actor/action/time) rendered as plain text line (no bubble) | [ChatPanel.md](Chat/ChatPanel.md) | [GAMEROOM_MOCKUP.html](GAMEROOM_MOCKUP.html) | ✅ |
| Settings | Settings button opens Settings modal (shared) | This file | [GAMEROOM_MOCKUP.html](GAMEROOM_MOCKUP.html) | ✅ |
| Settings | Chat settings filters: show conversation + show game events | This file | [GAMEROOM_MOCKUP.html](GAMEROOM_MOCKUP.html) | ✅ |
| Header | Room info + connection indicator + role toggle + leave | [HeaderBar.md](Header/HeaderBar.md) | [GAMEROOM_MOCKUP.html](GAMEROOM_MOCKUP.html) | ✅ |
| Board | Board placeholder region + phase badge | [GameBoard.md](Board/GameBoard.md) | [GAMEROOM_MOCKUP.html](GAMEROOM_MOCKUP.html) | ✅ |

## User Stories
- As a player, I want to join a room and see the game board, other players, and chat to play smoothly.
- As a spectator, I want to observe the game, see participants, and chat without affecting gameplay.
- Before the game starts, I want to toggle between player and spectator roles.

## Design Decisions
- ✅ **Spectators supported** - separate list below players, can chat, can switch roles pre-game only
- ✅ **Chat on mobile** - hidden behind floating button (not shown by default)
- ✅ **Player representation** - color dots only (no avatars for simplicity)
- ✅ **Action bar excluded** - game-specific controls designed separately per game
- ✅ **Game board area** - large placeholder for now

---

## Testing

### Unit tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| Room routing | `/room/:roomId` refresh/resume behavior | Mount at `/room/:roomId`; simulate refresh state restore; assert auto-join attempt; on join failure assert no redirect (Coverage: `app/src/App.gameroom.test.tsx`) | Attempts auto-rejoin; on failure stays on `/room/:roomId` |
| Presence model | Status computed from heartbeats keyed by `clientId` | Feed heartbeats keyed by `clientId`; advance clock; assert connected/reconnecting/offline transitions (Coverage: `app/src/services/presence.test.ts`) | Statuses are correct; no peerId-based ghost rows |
| Host identity | Host is identified by `hostClientId` (transport hostId = roomId) | Build UI projection from metadata+presence; assert host badge on participant with `hostClientId` (Coverage: `app/src/services/roomUiProjection.test.ts`) | Host badge follows `hostClientId` |
| Chat filtering | Settings flags hide/show conversation and move logs | Toggle chat flags; render mixed user/move/system stream; assert subsets hidden/shown (Coverage: `app/src/App.gameroom.test.tsx`) | Correct subsets visible; system always visible |

### Integration tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| Join handshake | Joiner connects and receives `room_snapshot` | Connect joiner; send `join_request`; await `room_snapshot`; assert UI state updates (Coverage: `app/src/hooks/useRoomContext.integration.test.ts`) | Snapshot applies; participants list populated |
| Host disconnect + takeover | Race-to-claim + state transfer + new host presence | Stop host signals; peers enter recovery; one claims stable endpoint; request/provide state; broadcast snapshot (Coverage: `app/src/hooks/useRoomContext.integration.test.ts`) | New host claims roomId; best snapshot chosen; snapshot + presence broadcast |
| Role toggle constraints | Role toggle disabled after game starts | Render GameRoom UI with phase != setup; click role toggle; assert disabled/no change (Coverage: `app/src/components/GameRoomPage.test.tsx`) | Toggle disabled; no role change |
| Layout invariants | Chat panel scrolls; composer remains visible | Render; overflow message list; assert message list scroll container exists; composer remains present and separate (Coverage: `app/src/components/GameRoomPage.test.tsx`) | Only message list scrolls; no double-scroll |

### E2E tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| GameRoom UX | Responsive layout + chat + participants flows | Run `npm run test:e2e`; join room; toggle participants/chat; send chat; validate layout across viewports (Coverage: `app/e2e/gameroom.spec.ts`) | Behaves per mockups across breakpoints |
| ChatPanel | Host+peer chat sync + unread badge behavior | Run `npm run test:e2e:peerjs`; host creates room → peer joins → exchange messages while chat visible (no badge) → close chat on one side → other sends message → assert unread badge increments → open chat → badge resets (Coverage: `app/e2e/chat-panel.peerjs.spec.ts`) | Messages sync; unread badge increments only when hidden and clears when opened |
| Host migration (baseline) | Real-tab host crash and peer takeover | Run `npm run test:e2e:peerjs` (starts local signaling per run); open 2 contexts; join same room; close host tab; wait for peer takeover + reconnect (Coverage: `app/e2e/host-migration.peerjs.spec.ts`) | Room continues after host tab closes; a peer becomes host; others reconnect |
| Host migration (pair) | Host+peer cross-browser, takeover, old host returns | Run `npm run test:e2e:peerjs`; start host in Chromium and joiner in Firefox; close host; verify joiner takes over; reopen old host and rejoin (Coverage: `app/e2e/host-migration.pair.peerjs.spec.ts`) | Peer takes over; old host rejoins as peer; room stays connected |
| Host migration (matrix) | Browser/layout matrix with 5 behaviors bundled per case | Run `npm run test:e2e:peerjs` (PeerJS enabled) → execute browser/layout matrix; each case runs bundled steps (join → close/leave/rejoin); Skips: the whole suite is skipped when PeerJS is disabled (`test.skip(!isPeerJsEnabledForThisRun(), ...)` in PeerJS specs). WebKit slots are mapped to Chromium (annotated as "chromium (was webkit)") and a small number of duplicate cases are skipped inside `app/e2e/host-migration.matrix.peerjs.spec.ts` (Coverage: `app/e2e/host-migration.matrix.peerjs.spec.ts`) | Covers same/cross browser + same/mixed layouts + bundled leave/close/rejoin scenarios |

**Spectators Section (below Players section):**
- 👁️ badge or "Spectator" label
- Color dot (dimmed/grayscale to distinguish from players)
- Display name
- Self marker: show "(tôi)" / "(me)" after the current user's own name
- Connection status (🟢 / 🔴 / 🟡)
- Count: "Spectators (3)"

**Layout by device:**
- **Desktop/PC:** Participants live inside the right **side sheet** under the "Participants" tab (Players + Spectators sections, scrollable)
- **Tablet:** Participants live inside the right **side sheet** under the "Participants" tab (Players + Spectators sections, scrollable)
- **Mobile:** Bottom sheet (slides up from bottom) showing both sections scrollable

**Labeling:**
- PC/Tablet tab label shows the total count in parentheses (e.g., "Participants (5)").
- Vietnamese wording for the tab/header uses **"Thành viên"** (not "Người chơi").

---

### Game Board Area (Center)
- Large placeholder region for game-specific rendering
- Subtle background pattern to indicate board space
- Centered text: "Game Board Area" (placeholder only, removed in implementation)
- Phase badge (top-left): "Setup" / "Playing" / "Finished"
- No action bar - controls designed per-game
- No debug viewer

---

### Chat Panel
**Scrollable message list:**
- Player messages with sender name
- Spectator messages marked as "[Spectator] {name}"
- System messages: join/leave/role change events
- **Move log messages (from game):** `{time} • {actor} {action}`
  - Example: `19:42 • Alice đặt quân vào ô B3`
  - **Rendering:** single-line text (no chat bubble, no message input styling)
  - Purpose: provide a lightweight, readable action history; not interactive.
- Input box: type + Enter to send
- Unread badge (red dot + number) when new chat messages arrive

**Unread badge behavior by device:**
- **PC/Tablet:** show unread badge on the **Chat tab** when chat is not visible (Participants tab active or side sheet collapsed).
- **Mobile:** show unread badge on the chat button when chat sheet is closed.

**Scrolling:**
- Chat message list scrolls independently (input stays visible).
- Avoid double scroll in side sheet: the side sheet body should not scroll the chat panel.

**PC/Tablet sizing rule:**
- In PC/Tablet layout, the right side sheet (and Chat tab content) uses the full available viewport height (below the header).
- The chat message list should not grow with message count; it takes the remaining available height and scrolls.
- The input area stays visible and anchored to the bottom of the chat area (content-height composer).

**Chat filtering (Settings → Chat settings):**
- If **Show conversation in chat** is OFF: hide `user` messages
- If **Show game events in chat** is OFF: hide `move` messages
- `system` messages are always visible

**Mobile behavior:**
- Hidden by default (not visible)
- Floating chat button (💬 icon) bottom-right corner
- Unread badge on button
- Tap button → slides chat panel up from bottom (overlay on board)
- Tap outside or close button → hides chat

---

## Responsive Layouts

### Desktop/PC (> 1024px)

Same as Tablet layout.

- Board always visible.
- Right side sheet with tabs (Participants / Chat).
- Optional collapse toggle to maximize board.

### Tablet (768px – 1024px)
```
┌─ Header (Game Name | Room ID | Status | Role Toggle | Leave | Settings) ─┐
├──────────────────────────────────────┬─ [Participants] ─────┐
│                                      │  [Participants Tab]  │
│        Game Board Area               │  • 🔴 Alice ⭐      │
│                                      │  • 🟢 Bob   (turn)  │
│        [Game Board]                  │  • 🟡 Carol         │
│                                      │                     │
│                                      │  Spectators (2):    │
│                                      │  • 🔵 David         │
│                                      │  • 🟣 Emma          │
│                                      │  [Scroll]           │
│                                      │  ─────────────────  │
│                                      │  [Chat Tab]         │
│                                      │  [Messages]         │
│                                      │  [Input]            │
└──────────────────────────────────────┴─ [Collapse toggle]──┘
```
- **Board:** Full width by default
- **Board:** Always visible (fixed)
- **Side panel:** Right side sheet with tabs (Participants | Chat), ~300px width
- **Collapse toggle:** Hides/shows side sheet to maximize board when needed

### Mobile (< 768px)
```
┌─ Header (Game name | Status | ⚙️ | 👥 | 🚪) ─────────────────┐
│                                                                │
│                 Game Board Area (full screen)                │
│                                                                │
│                    [Game Board]                               │
│                    [Game Board]                               │
│                    [Game Board]                               │
│                                                                │
│                                         [Floating 💬 button]   │
└────────────────────────────────────────────────────────────────┘

When tap 👥 button or 💬 button:
┌────────────────────────────────┐
│ ⌃ (swipe down to dismiss)      │
│                                │
│ Players:                        │
│ • 🔴 Alice ⭐                  │
│ • 🟢 Bob   (turn)              │
│ • 🟡 Carol                     │
│                                │
│ Spectators (2):                │
│ • 🔵 David                     │
│ • 🟣 Emma                      │
│ [Scrollable view]              │
└────────────────────────────────┘
```
- **Board:** Full-screen (100% width/height)
- **Header:** Icon-only buttons (role toggle icon, participant count, leave, settings)
- **Participants sheet:** Bottom sheet (slides up from bottom like Google Maps)
  - Triggered by tapping 👥 button
  - Dismiss: swipe down or tap outside
  - Content: Players section + Spectators section (scrollable)
- **Chat:** Floating button (bottom-right)
  - Icon: 💬
  - Unread badge: red dot + count
  - Tap → slides chat panel up from bottom
  - Tap outside/close → hides chat

---

## Data & State

```typescript
interface Player {
  id: string;
  name: string;
  colorDot: string;  // Hex color
  isHost: boolean;
  isReady: boolean;
  connectionStatus: 'connected' | 'offline' | 'reconnecting';
  currentTurn: boolean;
}

interface Spectator {
  id: string;
  name: string;
  colorDot: string;  // Dimmed
  connectionStatus: 'connected' | 'offline' | 'reconnecting';
}

interface Message {
  id: string;
  timestamp: number;
  type: 'user' | 'system' | 'move';

  // user
  senderId?: string;
  senderName?: string;
  isSpectator?: boolean;
  text?: string;

  // move (game action log)
  actorId?: string;
  actorName?: string;
  actionText?: string;
}

interface GameRoomState {
  roomId: string;
  hostId: string;
  players: Player[];
  spectators: Spectator[];
  gamePhase: 'setup' | 'playing' | 'finished';
  messages: Message[];
  currentPlayerTurn: string;  // playerId
  userRole: 'player' | 'spectator';  // current user's role
  connectionStatus: 'connected' | 'offline' | 'reconnecting';

  // User preferences (shared with Settings modal)
  preferences?: {
    language: 'vi' | 'en';
    theme: 'light' | 'dark';
    chat: {
      showConversation: boolean;
      showGameEvents: boolean;
    };
  };
}
```

## Networking & Presence (Mechanism)

This section documents the intended runtime mechanism behind the UI indicators, so the mockup/docs remain aligned with the actual networking behavior.

### Topology
- The room uses a **host-authoritative hub topology**: the Host is the source of truth for room snapshot, chat stream, and presence.
- Clients should not infer other participants' presence purely from local UI state; they should rely on Host presence updates.

### Chat synchronization
- All chat and system events are distributed via the Host to keep a single ordering.
- The Host broadcasts each chat message as a room-level event (append-only stream).
- Each message has a stable `id` and clients must dedupe to avoid duplicates on reconnect/resend.
- System messages (join/leave/role change) are emitted by the Host so all peers see the same history.

### Presence calculation
- Clients send periodic heartbeats to Host (recommended cadence: every ~2s), including a stable `clientId`.
- Host maintains `lastSeenAt` per participant **clientId** (not per peerId) and maps it to UI status:
  - `connected` (🟢): lastSeen within ~5s
  - `reconnecting` (🟡): lastSeen between ~5s and ~20s
  - `offline` (🔴): lastSeen older than ~20s
- Host broadcasts `presence_update` whenever computed statuses change. The payload is keyed by `clientId` so a peerId change does not create a “new person” in the UI.

### Instant reconnecting (no heartbeat wait)
- Heartbeat timeouts can be slow to reflect a real link drop.
- Therefore, Host should also listen to underlying peer connection lifecycle:
  - On connection `open` → mark participant `connected` immediately.
  - On connection `close`/`error` → mark participant `reconnecting` immediately.
- The Host then rebroadcasts `presence_update` right away so the Participants panel and Header indicator react instantly.

### Notes
- `offline` should be conservative (timeout-based) to avoid flapping on brief network hiccups.
- The UI shows status via icons (🟢/🟡/🔴) and may optionally show text labels for accessibility.

### Refresh / Rejoin behavior (current code)

This section documents the **current routing + reconnect behavior** so the UX and docs match what the app does today.

#### Routes

- Invite link routes are `/i/:roomId` (and legacy `/r/:roomId` is accepted). These routes do **not** auto-join.
- GameRoom route is `/room/:roomId`. This is **not** an invite URL.

#### Auto-rejoin on refresh

- When the user refreshes on `/room/:roomId`, the app may auto-rejoin **only if** it has stored join preferences for that room (meaning the user previously joined).
- Auto-rejoin waits for `displayName` to be loaded/valid (name gate) before attempting to join.

#### Failure handling (host offline)

- If auto-rejoin fails because the host is offline (and takeover has not happened yet), the app does **not** redirect to Home.
- The room can stay in a connecting/reconnecting UI state until the user chooses to Leave/Cancel.

#### Host refresh + takeover

- On refresh, if the restored room state indicates this runtime is the host, it first tries to restore the host PeerJS session.
- If host restore fails (e.g., takeover already happened and `roomId` is claimed), the old host joins back as a normal peer.
- Takeover is **race-to-claim**: when host-down is suspected, peers retry reconnect and also retry initializing PeerJS with `peerId = roomId`.
- Takeover attempts are gated: peers only retry initializing PeerJS with `peerId = roomId` once they have entered recovery (connection indicator is `reconnecting`/`offline`) based on host liveness thresholds, and never during the initial join handshake or while the host is considered `connected`.
- Host peerId is role-locked: once the host has successfully connected the first time, it must not intentionally switch away from `peerId = roomId` on signaling hiccups; it should attempt a signaling reconnect while keeping the same id.
- The winner increments `hostEpoch` to prevent split-brain; peers ignore snapshots/events from older epochs.
- Rejoin seat matching prefers a stable `clientId` (persisted until Settings → Clear data). If missing (legacy clients), the host may fall back to a displayName-based heuristic.

Known issue (observed in PeerJS E2E join waves):

- Under signaling churn, a runtime may accidentally re-initialize with the wrong `peerId` (e.g., a joiner attempting `peerId = roomId`), which causes `ID is taken` collisions and can stall the room in `offline`. The stability invariants above are the intended fix and must be enforced by the implementation.

UI identity note (current code):

- The UI identifies “me” and computes the role toggle from `clientId` first (fallback `peerId`) to handle cases where PeerJS `peerId` changes across refresh/rejoin.

### Host down + takeover (proposal)

Details and historical alternatives are documented here:
- [HostDisconnectAndTakeover.md](proposals/HostDisconnectAndTakeover.md)

### Future Direction (B): UI projections for game/event code

When we start implementing per-game domain events, the target architecture is:

- Persist raw domain events (per game)
- Generate **room-level UI projections** (stable, shared UI)
- Generate **game-level projections** (per-game renderer/effects)

Canonical deep-dive: `docs/architecture/many_games_many_event_types.md`

Field requirements by `Message.type`:
- `user`: requires `senderId`, `senderName`, `text` (and may set `isSpectator`)
- `system`: requires `text`
- `move`: requires `actorName`, `actionText` (and uses `timestamp` for when)

**Room Events:**
- `playerJoined`: New player enters
- `playerLeft`: Player leaves
- `spectatorJoined`: New spectator joins
- `spectatorLeft`: Spectator leaves
- `playerToSpectator`: Player became spectator
- `spectatorToPlayer`: Spectator became player
- `turnChanged`: Game turn changed to next player
- `gamePhaseChanged`: Phase changed (setup → playing → finished)
- `messageSent`: New chat message
- `moveLogged`: New move log line appended to chat (actor/action/time)
- `playerStatusChanged`: Player ready/unready

---

## Accessibility
- All interactive elements keyboard accessible (Tab, Enter, Esc)
- Color dots sufficiently contrasted
- Status indicators use icon + text (not color alone)
- Chat input: Enter to send, Shift+Enter for new line
- Screen readers: alt text for status indicators
- Role announcements: "You are now a spectator" / "You are now a player"

---

## Testing Checklist

**Participant Management:**
- [ ] Player joins room → appears in Players section
- [ ] Spectator joins room → appears in Spectators section
- [ ] Player leaves → removed from Players section
- [ ] Spectator leaves → removed from Spectators section
- [ ] Player becomes spectator → moves to Spectators section
- [ ] Spectator becomes player (pre-game) → moves to Players section
- [ ] Role toggle button shows correct text for current role
- [ ] Role toggle disabled once game starts

**Chat:**
- [ ] Player sends message → appears in chat with player name
- [ ] Spectator sends message → appears with "[Spectator]" label
- [ ] System message on join/leave event
- [ ] System message on role change
- [ ] Move log message appears as a plain single line (no bubble)
- [ ] Settings: turning OFF "Show conversation" hides user messages
- [ ] Settings: turning OFF "Show game events" hides move log lines
- [ ] System messages remain visible regardless of settings
- [ ] Unread badge appears on PC/Tablet when chat tab is not visible
- [ ] Mobile: Unread badge on floating button
- [ ] Enter to send message, Shift+Enter for new line

---

## Component Docs
- [GameRoom Tests (Index)](tests.md)
- [Header Bar](Header/HeaderBar.md)
- [Participants Panel](Participants/ParticipantsPanel.md)
- [Game Board](Board/GameBoard.md)
- [Chat Panel](Chat/ChatPanel.md)
- [Settings Modal (shared)](../../components/SettingsModal.md)

**Connection Status:**
- [ ] Online status shown as 🟢
- [ ] Offline status shown as 🔴
- [ ] Reconnecting status shown as 🟡
- [ ] Header connection indicator updates

**Responsive:**
- [ ] Desktop/PC: Board + tabbed side panel visible
- [ ] Tablet: Board + tabbed side panel, tabs switchable
- [ ] Mobile: Board full-screen, bottom sheet and floating button functional
- [ ] Mobile: Bottom sheet swipe-down dismiss works

**Color Dots:**
- [ ] Each player has distinct color
- [ ] Spectators have dimmed color
- [ ] Sufficient contrast for accessibility

---

## Open Questions / Future Work
- Should spectators see different game board rendering than players?
- Max spectator limit per room?
- Chat permissions for spectators (slow mode, mute by host)?
- Game-specific actions designed later

