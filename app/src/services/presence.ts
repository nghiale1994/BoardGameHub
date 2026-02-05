import type { RoomMetadata } from "../utils/types";
import type { PresenceStatus } from "./roomUiProjection";

type ComputePresenceArgs = {
  metadata: RoomMetadata;
  lastSeenByClientId: Map<string, number>;
  now?: number;
};

export const computePresenceStatusesFromHeartbeats = ({
  metadata,
  lastSeenByClientId,
  now = Date.now()
}: ComputePresenceArgs): Record<string, PresenceStatus> => {
  const CONNECTED_MS = 5_000;
  const OFFLINE_MS = 20_000;

  const allClientIds = new Set<string>([
    metadata.hostClientId,
    ...metadata.players.map((p) => p.clientId),
    ...(metadata.spectators ?? []).map((s) => s.clientId)
  ]);

  const result: Record<string, PresenceStatus> = {};
  for (const clientId of allClientIds) {
    if (clientId === metadata.hostClientId) {
      result[clientId] = "connected";
      continue;
    }

    const lastSeen = lastSeenByClientId.get(clientId);
    if (lastSeen === undefined) {
      result[clientId] = "reconnecting";
      continue;
    }

    const age = now - lastSeen;
    if (age <= CONNECTED_MS) result[clientId] = "connected";
    else if (age <= OFFLINE_MS) result[clientId] = "reconnecting";
    else result[clientId] = "offline";
  }

  return result;
};
