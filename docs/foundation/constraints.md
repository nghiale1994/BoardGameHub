# Project Constraints (Canonical)

> NOTE: AI must read docs/ai/README.md before modifying this file.

Version: 2026-02-04

Changelog:

- 2026-02-02: Moved constraints here (canonical) and fixed referenced paths; added constraints for event queue and manual host handoff.
- 2026-02-03: Canonicalized host migration as race-to-claim + state transfer; removed deterministic election wording.
- 2026-02-03: Clarified stable identity + presence are `clientId`-keyed (peerId is transport only), including `hostClientId`.
- 2026-02-03: Reduced overlap with other foundation docs; this file now focuses on requirements (not flow narration).
- 2026-02-03: Added Testing section with Unit/Integration/E2E tables.
- 2026-02-04: Renamed Testing tables column to "Test Steps" and rewrote entries as ordered procedures.

## 1) Project-wide constraints

- Frontend-only: tuyệt đối không tạo backend server hoặc lưu trữ dữ liệu tập trung.
- Tech stack: Vite + React + TypeScript (chi tiết trong `docs/config/tech_stack.yaml`).
- Communication: dùng PeerJS (WebRTC) cho signaling; dùng public STUN servers (cấu hình trong `docs/config/hub_config.yaml`).
- No authentication: chỉ thu tên người chơi (displayName). Không lưu mật khẩu hay token.
- i18n: Tiếng Việt (vi) > Tiếng Anh (en); cấu hình trong `docs/config/i18n.yaml`.

## 2) Host authoritative model

- Khi một phòng được tạo, creator trở thành `host` (source-of-truth).
- All game logic execution must occur on the host: clients send event messages; host validates, applies rules, updates state, then broadcasts new state.
- Clients must never apply authoritative logic locally except for UI optimizations; final state must come from host.

## 3) Room / URL behavior

- Room created => produce share URL (stable).
- Joining via URL joins the appropriate room and syncs to latest known state.

## 4) Persistence and multi-tab

- Use IndexedDB (via `idb`) for primary state persistence and LocalStorage for small items and cross-tab signaling.
- Support multi-tab: show the latest state; use BroadcastChannel or `storage` events to sync tabs.
- Persisted displayName: displayName phải được lưu trong browser và tự load lại; user có thể đổi tên bất cứ lúc nào.

Identity & presence (current app):

- Mỗi participant có `clientId` ổn định (persisted theo browser profile) để nhận diện người chơi giữa các lần refresh/rejoin.
- `peerId` có thể thay đổi và chỉ dùng cho PeerJS addressing/transport.
- Presence updates (`presence_update.statuses`) được key theo `clientId` để tránh “peerId đổi => coi như người mới”.
- `RoomMetadata.hostClientId` dùng để nhận diện host ổn định (transport host endpoint vẫn là `hostId = roomId`).

## 5) Host migration (canonical)

Requirements (current app):

- Host liveness must primarily be derived from host messages, especially `presence_update` from the stable endpoint (`senderId === roomId`).
- Takeover must be **race-to-claim** on the stable endpoint (`peerId = roomId`).
- `hostEpoch` must increase on each successful takeover; all messages/snapshots must include `{roomId, hostEpoch}`.
- Peers must ignore snapshots/events from older `hostEpoch` than the latest observed.
- The new host must perform **state transfer**: request snapshots from live peers, choose the best available snapshot, reconcile metadata, and broadcast the canonical `room_snapshot`.
- Old host returns: if `roomId` is already claimed by a new host, the old host must join as a normal peer (must not auto-claim `roomId`).

Canonical flow diagrams live in `docs/foundation/flows.md`.

## 6) PeerJS details

- Dùng PeerJS hoặc wrapper tương đương cho peer-to-peer data channels.
- Cấu hình ICE/STUN servers trong `docs/config/hub_config.yaml`.

## 7) Event & state rules

- Events: immutable messages: `{type, payload, senderId, timestamp}`.
- Host validates event theo game rules; nếu invalid thì reject và notify sender.
- Host áp event vào state bằng pure reducer functions; broadcast snapshot hoặc diff tối thiểu.

Event queue (planned):

- Client phải có khả năng **queue các event/intents** khi mất kết nối tới host (hoặc trong lúc migration), và flush lại khi kết nối ổn định.
- Queue phải chống duplicate (event id/nonce + idempotency) và có cơ chế ack từ host.
- Không được phá host-authoritative model: event chỉ được “commit” khi host xác nhận/broadcast state.

## 8) Separation of concerns

- UI layer: render state và dispatch local intents.
- Networking layer: PeerJS connections, reconnects, host election, broadcasting.
- Game logic layer: pure modules, referenced từ DSL/spec. UI không chứa luật game.

## 9) Safety & privacy

- Không lưu secrets hoặc API keys.
- Không lưu PII ngoài `displayName`.

## 10) Game schema and DSL

- Game schema: mỗi game có schema riêng; không cần schema tổng.
- Hub config: `docs/config/hub_config.yaml` chứa cấu hình ICE servers, persistence settings, host election rules.

## 11) Code quality

- Host logic phải có unit-tests.
- Components nhỏ, composable.
- UX hiện đại, responsive; light/dark; i18n.
- Settings: theme toggle, clear data, language dropdown, chat filter prefs. Bỏ: STUN server config trong UI.

## 12) Documentation

- Markdown files: quy tắc, diễn giải, workflows, design decisions.
- DSL files: thông số kỹ thuật, cấu hình, các giá trị cụ thể (`docs/config/*`).

## 13) Change control

- Mọi sửa đổi constraints cần approval rõ ràng trong file này.

## 14) Responsive design (mandatory)

- Percentage-based/responsive sizing: ưu tiên %, vw, vh, clamp(), min(), max().
- No fixed pixel sizes for layout properties.
- Pixel chỉ ok cho: border-radius, borders/outlines, box-shadow blur/spread, và các non-layout visual attributes.

## 15) i18n updates (mandatory)

- All user-facing text must be in i18n system: thêm key vào `docs/config/i18n.yaml` với cả vi/en.
- No hardcoded strings in components.
- Design docs phải có phần mapping label localization (VN/EN) khi có UI text.

## Testing

### Unit tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| URL helpers | Invite vs room URL parsing and normalization | Parse `/i/:roomId` and legacy `/r/:roomId`; build share URL; normalize back to roomId (Coverage: `app/src/services/roomHelpers.test.ts`) | `/i/:roomId` and `/room/:roomId` behave per constraints |
| Identity & presence | `clientId` persistence and presence status computation | Persist `clientId`/displayName; compute presence status from timestamps keyed by `clientId` (Coverage: `app/src/services/persistence.test.ts`, `app/src/services/presence.test.ts`) | Presence keyed by clientId; thresholds applied correctly |
| Host migration guards | `hostEpoch` monotonicity + ignore older epochs | Apply envelopes in mixed hostEpoch order; assert older epochs are ignored and metadata stays at newest epoch (Coverage: `app/src/hooks/useRoomContext.foundation.test.ts`) | Older-epoch messages ignored; no split-brain state apply |

### Integration tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| Join + snapshot | Join request includes `clientId`; snapshot update syncs UI | Connect joiner to roomId; send `join_request {clientId}`; await `room_snapshot`; assert participants recognized by `clientId` (Coverage: `app/src/hooks/useRoomContext.integration.test.ts`) | UI converges on host snapshot; participants recognized by clientId |
| Takeover | Race-to-claim + state transfer | Simulate host silence; attempt claim `peerId=roomId`; request state; select best snapshot; broadcast canonical snapshot (Coverage: `app/src/hooks/useRoomContext.integration.test.ts`) | New host broadcasts canonical snapshot + presence |

### E2E tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| Multi-tab constraints | Last tab wins + stable identity under refresh | E2E (Playwright multi-page) — proposed; not yet implemented in repo | No duplicate identities; room resumes correctly |
