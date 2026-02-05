# ParticipantsPanel Component Design

> NOTE: AI must read docs/ai/README.md before modifying this file.

<!-- markdownlint-disable MD022 MD032 MD031 MD040 MD060 -->

Version: 2026-02-04
Changelog:
- 2026-01-31: Created ParticipantsPanel component doc (players + spectators + statuses).
- 2026-02-02: Clarified presence source (host-authoritative) and instant reconnecting behavior.
- 2026-02-02: Updated VI Participants label to "Thành viên" and clarified participants count label (tab header).
- 2026-02-02: Added self marker "(tôi)/(me)" after the current user's name.
- 2026-02-03: Clarified presence/status identity is keyed by stable `clientId` (peerId is transport only).
- 2026-02-03: Standardized Testing section into Unit/Integration/E2E tables.
- 2026-02-04: Renamed Testing tables column to "Test Steps" and rewrote entries as ordered procedures.

## Purpose
Show who is in the room, separated into Players and Spectators, with status indicators.

## User Stories
- As a player, I want to see who is playing and whose turn it is.
- As a spectator, I want to see who is in the room and their connection status.

## UI Components
- **Players section** with count label
- **Spectators section** with count label
- **Participant row**: color dot, name, status badges

Optional shell-level label (context)
- Side sheet tab/header for the whole panel shows total participants count in parentheses (e.g., "Participants (5)").
- Vietnamese wording for this shell label uses **"Thành viên"**.

## Requirements
- Players list:
  - Color dot
  - Display name
  - Self marker: append "(tôi)/(me)" after your own name
  - Host badge ⭐
  - Connection status (🟢/🔴/🟡)
  - Turn indicator
  - Ready status (pre-game)

- Spectators list:
  - Label or eye badge
  - Dimmed color dot
  - Display name
  - Self marker: append "(tôi)/(me)" after your own name
  - Connection status (🟢/🔴/🟡)
  - Count label (e.g., "Spectators (3)")

## Role rules
- Spectators can chat.
- Role toggle is allowed **pre-game only**; disabled once game starts.

## Behaviour
- Updates live when participants join/leave or change role.
- Current turn is indicated for the active player.
- Ready status is shown **pre-game only**.
- Connection status is driven by host-authoritative presence updates (not inferred purely client-side).
  - Heartbeat-based: Host computes `connected`/`reconnecting`/`offline` via last-seen thresholds.
  - Instant reconnecting: on peer connection `close`/`error`, status should flip to 🟡 immediately while waiting for recovery.

Identity note:

- Presence statuses are associated to a participant by stable `clientId` (not by PeerJS `peerId`) so refresh/rejoin peerId churn does not create “ghost reconnecting” rows.

## Mermaid
```mermaid
flowchart LR
  U[User] -->|toggle role (pre-game)| GR[GameRoom]
  GR -->|update role| P[ParticipantsPanel]
  GR -->|system message| C[ChatPanel]
```

## Label Localization (VN/EN)
- Thành viên / Participants
- Người chơi / Players
- Khán giả / Spectators
- Online / Online
- Offline / Offline
- Reconnecting / Reconnecting

## Testing

### Unit tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| ParticipantsPanel | Splits players vs spectators | Render GameRoomPage with mixed players/spectators; assert both sections + counts render (Coverage: `app/src/components/GameRoomPage.test.tsx`) | Two sections rendered with correct counts |
| ParticipantsPanel | Host badge driven by `hostClientId` | Render with known hostClientId; assert host marker appears on that row (Proposed; not yet implemented in repo) | ⭐ shows on the participant matching hostClientId |
| ParticipantsPanel | Status indicators render | Render participants with connected/reconnecting/offline; assert per-row status badge/icons (Proposed; not yet implemented in repo) | 🟢/🔴/🟡 icons appear correctly |
| ParticipantsPanel | Self marker uses stable `clientId` | Render with current `clientId`; assert "(me)/(tôi)" appears only on self row (Coverage: `app/src/components/GameRoomPage.test.tsx`) | "(tôi)/(me)" shown only for self |

### Integration tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| Presence updates | UI updates when host broadcasts `presence_update` | Deliver `presence_update` to room context; assert UI participant list updates without duplication (Proposed; not yet implemented in repo) | Status badges update without duplicating rows |
| Role changes | Player ↔ spectator moves between sections (pre-game) | Emit role change request + apply updated snapshot; assert participant moves sections and counts update (Proposed; not yet implemented in repo) | Participant moves lists; counts update |

### E2E tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| Participants UX | Join/leave + status transitions | E2E (Playwright) — proposed; not yet implemented in repo | UI stays consistent during refresh/rejoin churn |

## DSL Configuration
- None (GameRoom feature-level only; no separate YAML defined for ParticipantsPanel yet)
