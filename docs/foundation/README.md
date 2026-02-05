# Foundation (Canonical entrypoint)

> NOTE: AI must read docs/ai/README.md before modifying this file.

This folder groups the repo-wide foundations:

- What is allowed (constraints)
- How the system is structured (architecture)
- The core flows (join/event lifecycle/host migration)

Start here for cross-cutting changes (networking, persistence, host migration, multi-game support).

## Canonical docs

- `docs/foundation/constraints.md`
- `docs/foundation/architecture.md`
- `docs/foundation/flows.md`

## Implementation notes (deep dives)

- `docs/foundation/peerjs.md` — PeerJS/WebRTC implementation details + troubleshooting (links back to canonical docs above)

## Deep dives

- `docs/architecture/many_games_many_event_types.md` — many-games + many-event-types model and UI projection approach
