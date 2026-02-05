import { describe, expect, test } from "vitest";
import { projectRoomUiModel } from "./roomUiProjection";
import type { RoomMetadata, RoomSnapshot } from "../utils/types";

const makeMetadata = (overrides?: Partial<RoomMetadata>): RoomMetadata => ({
  roomId: "ROOM123",
  gameId: "catan",
  hostId: "ROOM123",
  hostClientId: "c_host",
  hostName: "Host",
  hostEpoch: 0,
  players: [
    { clientId: "c_host", peerId: "ROOM123", displayName: "Host", joinedAt: 0 },
    { clientId: "c_self", peerId: "peer_old", displayName: "Alice", joinedAt: 1 }
  ],
  spectators: [{ clientId: "c_spec", peerId: "peer_spec", displayName: "Bob", joinedAt: 2 }],
  createdAt: 0,
  maxPlayers: 4,
  ...overrides
});

describe("projectRoomUiModel", () => {
  // Tests: host identity follows hostClientId despite peerId churn.
  // Steps:
  // 1) Build metadata where host clientId stays stable but peerId changes.
  // 2) Call projectRoomUiModel.
  // 3) Assert host member isHost and role is "host".
  test("host identity follows hostClientId (not peerId churn)", () => {
    console.log("[test] projectRoomUiModel host identity follows hostClientId");

    // Step 1) Build metadata where host clientId stays stable but peerId changes.
    const metadata = makeMetadata({
      hostId: "ROOM123",
      hostClientId: "c_host",
      players: [
        // Host peerId changed, but clientId remains host.
        { clientId: "c_host", peerId: "peer_host_new", displayName: "Host", joinedAt: 0 },
        { clientId: "c_self", peerId: "peer_self", displayName: "Alice", joinedAt: 1 }
      ]
    });

    // Step 2) Call projectRoomUiModel.
    console.log("[test] project RoomUI model");
    const ui = projectRoomUiModel({
      roomId: metadata.roomId,
      metadata,
      snapshot: { metadata, gameState: { phase: "setup" }, version: 1, lastEventId: "" } satisfies RoomSnapshot,
      localPeerId: "peer_self",
      localClientId: "c_self",
      localDisplayName: "Alice",
      isHost: false,
      connectionStatus: "connected",
      participantStatuses: {
        c_host: "connected",
        c_self: "connected"
      }
    });

    // Step 3) Assert host member isHost and role is "host".
    console.log("[test] assert host member isHost + role");
    const host = ui.members.players.find((p) => p.clientId === "c_host");
    expect(host?.isHost).toBe(true);
    expect(host?.role).toBe("host");
  });

  // Tests: self derived from localClientId even if localPeerId changed.
  // Steps:
  // 1) Build metadata where self seat uses an old peerId but stable clientId.
  // 2) Call projectRoomUiModel with a new localPeerId.
  // 3) Assert ui.self.role is player and the member isSelf flag is set.
  test("self is determined by localClientId even if localPeerId changed", () => {
    console.log("[test] projectRoomUiModel self determined by localClientId");

    // Step 1) Build metadata where self seat uses an old peerId but stable clientId.
    const metadata = makeMetadata({
      players: [
        { clientId: "c_host", peerId: "ROOM123", displayName: "Host", joinedAt: 0 },
        // Stored seat uses old peer id, but stable clientId should match.
        { clientId: "c_self", peerId: "peer_old", displayName: "Alice", joinedAt: 1 }
      ]
    });

    // Step 2) Call projectRoomUiModel with a new localPeerId.
    console.log("[test] project RoomUI model with new localPeerId");
    const ui = projectRoomUiModel({
      roomId: metadata.roomId,
      metadata,
      snapshot: { metadata, gameState: { phase: "setup" }, version: 1, lastEventId: "" } satisfies RoomSnapshot,
      localPeerId: "peer_new",
      localClientId: "c_self",
      localDisplayName: "Alice",
      isHost: false,
      connectionStatus: "connected",
      participantStatuses: {}
    });

    // Step 3) Assert ui.self.role is player and the member isSelf flag is set.
    console.log("[test] assert ui.self + members mark isSelf");
    expect(ui.self.role).toBe("player");
    expect(ui.members.players.find((p) => p.clientId === "c_self")?.isSelf).toBe(true);
  });

  // Tests: canToggleRole only true when snapshot exists and phase=setup.
  // Steps:
  // 1) Build default metadata.
  // 2) Call projectRoomUiModel with snapshot=null.
  // 3) Assert canToggleRole is false.
  // 4) Call projectRoomUiModel with snapshot phase=playing.
  // 5) Assert canToggleRole is false.
  test("canToggleRole is only true when snapshot exists and phase is setup", () => {
    console.log("[test] projectRoomUiModel canToggleRole gating");

    // Step 1) Build default metadata.
    const metadata = makeMetadata();

    // Step 2) Call projectRoomUiModel with snapshot=null.
    console.log("[test] project with snapshot=null");
    const uiNoSnapshot = projectRoomUiModel({
      roomId: metadata.roomId,
      metadata,
      snapshot: null,
      localPeerId: "peer_self",
      localClientId: "c_self",
      localDisplayName: "Alice",
      isHost: false,
      connectionStatus: "connected",
      participantStatuses: {}
    });

    // Step 3) Assert canToggleRole is false.
    expect(uiNoSnapshot.canToggleRole).toBe(false);

    // Step 4) Call projectRoomUiModel with snapshot phase=playing.
    console.log("[test] project with phase=playing");
    const uiPlaying = projectRoomUiModel({
      roomId: metadata.roomId,
      metadata,
      snapshot: { metadata, gameState: { phase: "playing" }, version: 1, lastEventId: "" } satisfies RoomSnapshot,
      localPeerId: "peer_self",
      localClientId: "c_self",
      localDisplayName: "Alice",
      isHost: false,
      connectionStatus: "connected",
      participantStatuses: {}
    });

    // Step 5) Assert canToggleRole is false.
    expect(uiPlaying.canToggleRole).toBe(false);
  });
});
