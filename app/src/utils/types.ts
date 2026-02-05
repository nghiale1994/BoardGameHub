// Room and peer types for P2P networking

export type PeerId = string;

export type Player = {
  // Stable per-browser identity (cleared only via Settings → Clear data).
  // Used to match rejoining users when PeerJS peerId changes.
  clientId: string;
  peerId: PeerId;
  displayName: string;
  joinedAt: number; // timestamp
};

export type RoomMetadata = {
  roomId: string;
  gameId: string;
  hostId: PeerId;
  // Stable identity of the current host (cleared only via Settings → Clear data).
  // Host peerId is the roomId endpoint, but the host browser profile is identified by hostClientId.
  hostClientId: string;
  hostName: string;
  hostEpoch: number;
  players: Player[];
  spectators: Player[];
  createdAt: number;
  maxPlayers: number;
};

export type RoomSnapshot = {
  metadata: RoomMetadata;
  gameState: Record<string, unknown>; // Game-specific state
  version: number;
  lastEventId: string;
};

export type PeerEvent = {
  type: string;
  payload: unknown;
  senderId: PeerId;
  timestamp: number;
  roomId: string;
  hostEpoch: number;
};

