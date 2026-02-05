NOTE: AI must read docs/ai/README.md before modifying this file.

Version: 2026-02-01

Changelog:
- 2026-02-01: Extracted game module rules; clarified room-vs-game projection boundaries.
- 2026-02-05: Moved `rules_code_game.md` into module folder and created this `README.md` as canonical location.

# Game Code Rules (Per-game modules)

> Canonical module for per-game code rules.

## Skills (automation)

- `validate-projections`: Checks allowed room-level projections.
- `check-schema`: Validates domain event schemas and namespacing.

Skills are located under `docs/ai/rules_code_game/skills/`.

---

(Original content follows)

NOTE: AI must read docs/ai/README.md before modifying this file.

Version: 2026-02-01

Changelog:
- 2026-02-01: Extracted game module rules; clarified room-vs-game projection boundaries.

# Game Code Rules (Per-game modules)

## Scope

Applies to per-game logic, including:

- Per-game domain event schemas
- Adapters from domain events → projections
- Game renderer/effects mapping

## 1) Game emits data, not UI

Game code must not mutate GameRoom UI directly.

Instead, game may emit:

- **Room-level projections** (affecting GameRoom shell UI)
- **Game-level projections** (affecting game renderer/effects)

## 2) Two projection channels (hard boundary)

- Room-level projections: for GameRoom shell (chat/status/turn/toast).
- Game-level projections: for per-game effects/animations/visuals.

Do not move board/hand/card UI details into room-level.

## 3) Allowed room-level projections (v1)

Game may emit the following room-level projections:

- `RoomChatAppend` (append a `ChatLogEntry`, including move log lines)
- `RoomTurnHighlight` (highlight current player)
- `RoomGameStatus` (`playing` / `paused`)
- `RoomToast` (room-scoped toast)
- (Optional) `RoomPhaseBadge` (high-level phase label)

Anything beyond this list requires explicit user approval.

## 4) Schema/versioning

- Domain events must be namespaced: `<gameId>.<eventName>`.
- Include `schemaVersion` and keep changes additive when possible.

## 5) Testing

- Adapter tests: event → correct projections.
- Fixtures: keep sample events for validation.
- Game renderer tests (if present): effects consumed without impacting GameRoom shell.