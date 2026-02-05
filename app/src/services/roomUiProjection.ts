import type { PeerId, RoomMetadata, RoomSnapshot } from "../utils/types";

export type PresenceStatus = "connected" | "reconnecting" | "offline";

export type RoomMemberRole = "host" | "player" | "spectator";

export type RoomMemberUI = {
  peerId: PeerId;
  clientId: string;
  displayName: string;
  role: RoomMemberRole;
  isSelf: boolean;
  isHost: boolean;
  status: PresenceStatus;
};

export type RoomSelfUI = {
  peerId: PeerId;
  clientId: string;
  displayName: string;
  role: "player" | "spectator" | "unknown";
  isSpectator: boolean;
};

export type RoomUIModel = {
  roomId: string;
  gameId: string;
  phase: string;
  canToggleRole: boolean;
  isHost: boolean;
  connectionStatus: PresenceStatus;
  hostId: PeerId;
  hostName?: string;
  self: RoomSelfUI;
  members: {
    players: RoomMemberUI[];
    spectators: RoomMemberUI[];
    totalCount: number;
  };
};

const coercePresenceStatus = (
  value: unknown,
  fallback: PresenceStatus
): PresenceStatus => {
  if (value === "connected" || value === "reconnecting" || value === "offline") return value;
  return fallback;
};

export const projectRoomUiModel = (args: {
  roomId: string;
  metadata: RoomMetadata;
  snapshot: RoomSnapshot | null;
  localPeerId: PeerId;
  localClientId: string;
  localDisplayName: string;
  isHost: boolean;
  connectionStatus: PresenceStatus;
  participantStatuses: Record<string, PresenceStatus>;
}): RoomUIModel => {
  const {
    roomId,
    metadata,
    snapshot,
    localPeerId,
    localClientId,
    localDisplayName,
    isHost,
    connectionStatus,
    participantStatuses
  } = args;

  const phase =
    (snapshot?.gameState as { phase?: string } | null)?.phase ?? "setup";

  // Preserve current behavior: only allow role toggle when we have a snapshot and it is still setup.
  const canToggleRole = snapshot ? phase === "setup" : false;

  const isSelf = (peerId: PeerId, clientId?: string) => {
    if (clientId && clientId === localClientId) return true;
    return peerId === localPeerId;
  };

  const findSelf = (): { role: RoomSelfUI["role"]; displayName: string } => {
    const playerByClient = metadata.players.find((p) => p.clientId === localClientId);
    if (playerByClient) return { role: "player", displayName: playerByClient.displayName };

    const spectatorByClient = (metadata.spectators ?? []).find((s) => s.clientId === localClientId);
    if (spectatorByClient) return { role: "spectator", displayName: spectatorByClient.displayName };

    const playerByPeer = metadata.players.find((p) => p.peerId === localPeerId);
    if (playerByPeer) return { role: "player", displayName: playerByPeer.displayName };

    const spectatorByPeer = (metadata.spectators ?? []).find((s) => s.peerId === localPeerId);
    if (spectatorByPeer) return { role: "spectator", displayName: spectatorByPeer.displayName };

    return { role: "unknown", displayName: localDisplayName.trim() || "Player" };
  };

  const selfFound = findSelf();

  const toMemberUI = (p: { peerId: PeerId; clientId: string; displayName: string }, role: RoomMemberRole): RoomMemberUI => {
    const fallback = isSelf(p.peerId, p.clientId) ? connectionStatus : "reconnecting";
    const status = coercePresenceStatus(participantStatuses[p.clientId], fallback);
    const memberIsHost = p.clientId === metadata.hostClientId || p.peerId === metadata.hostId;
    return {
      peerId: p.peerId,
      clientId: p.clientId,
      displayName: p.displayName,
      role: memberIsHost ? "host" : role,
      isSelf: isSelf(p.peerId, p.clientId),
      isHost: memberIsHost,
      status
    };
  };

  const players = (metadata.players ?? []).map((p) => toMemberUI(p, "player"));
  const spectators = (metadata.spectators ?? []).map((s) => toMemberUI(s, "spectator"));

  return {
    roomId,
    gameId: metadata.gameId,
    phase,
    canToggleRole,
    isHost,
    connectionStatus,
    hostId: metadata.hostId,
    hostName: metadata.hostName,
    self: {
      peerId: localPeerId,
      clientId: localClientId,
      displayName: selfFound.displayName,
      role: selfFound.role,
      isSpectator: selfFound.role === "spectator"
    },
    members: {
      players,
      spectators,
      totalCount: players.length + spectators.length
    }
  };
};
