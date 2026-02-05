NOTE: AI must read docs/ai/README.md before modifying this file.
Version: 2026-02-04
Changelog:
- 2026-02-04: Created Chat folder test index and linked implemented unit/integration/E2E coverage.

# GameRoom Chat Tests (Index)

This file aggregates test coverage for GameRoom chat components.

Canonical sources:
- `docs/features/GameRoom/design.md`
- `docs/features/GameRoom/Chat/ChatPanel.md`

## Testing

### Unit tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| ChatPanel | Spectator label + unread badge behavior | Render GameRoomPage with spectator user message; assert `[Spectator] {name}` label. Render with baseline history; while chat hidden append new user message from other; assert unread badge increments on Chat tab (PC/Tablet) / chat button (Mobile); open chat; assert badge clears (Coverage: `app/src/components/GameRoomPage.test.tsx`) | Spectator label is used; unread badge increments only when hidden and clears when opened |
| ChatPanel | Filtering and move log rendering contract | Render GameRoomPage with user/system/move; toggle filter flags; assert user/move hidden while system remains; assert move log line renders as plain text (Coverage: `app/src/components/GameRoomPage.test.tsx`) | Filters apply; move log renders as a single readable line |

### Integration tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| Host-authoritative chat sync | Dedupe by message id on resend/reconnect | Restore joined state in `useRoomContext`; emit duplicate `chat_event` payloads with the same `message.id`; assert hook appends only one message (Coverage: `app/src/hooks/useRoomContext.integration.test.ts`) | Hook state shows each message once |

### E2E tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| ChatPanel | Host+peer sync + unread badge across browser/layout matrices | Run PeerJS E2E: host creates room → peer joins → exchange messages with chat open (no badge) → close chat on one side → other sends → assert unread badge increments → open chat → badge resets (Coverage: `app/e2e/chat-panel.peerjs.spec.ts`) | Messages sync; unread badge increments only when hidden and clears when opened |
