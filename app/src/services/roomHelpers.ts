import type { PeerId, RoomMetadata } from "../utils/types";

/**
 * Generate a room ID (short alphanumeric).
 */
export const generateRoomId = (): string => {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
};

/**
 * Parse room ID from share URL.
 */
export const parseShareUrl = (url: string): string | null => {
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Accept raw room id input.
  if (/^[a-zA-Z0-9]+$/.test(trimmed)) return trimmed;

  // Accept redirected invite paths like /?/i/ROOMID (from GitHub Pages SPA redirect)
  const redirectMatch = trimmed.match(/\?\/(?:i|r)\/([a-zA-Z0-9]+)/);
  if (redirectMatch) return redirectMatch[1];

  // Accept relative invite paths like /i/ROOMID (and legacy /r/ROOMID)
  const directMatch = trimmed.match(/\/(?:i|r)\/([a-zA-Z0-9]+)/);
  if (directMatch) return directMatch[1];

  // Accept absolute URLs.
  try {
    const urlObj = new URL(trimmed);
    const normalizedPath = urlObj.pathname.startsWith('/?/') ? urlObj.pathname.slice(3) : urlObj.pathname;
    const match = normalizedPath.match(/\/(?:i|r)\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

/**
 * Build a share URL for a room.
 */
export const buildShareUrl = (roomId: string): string => {
  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, ''); // Remove trailing slash
  return `${window.location.origin}${baseUrl}/i/${roomId}`;
};

/**
 * Initialize room metadata with creator as host.
 */
export const initializeRoomMetadata = (
  roomId: string,
  gameId: string,
  creatorPeerId: PeerId,
  creatorName: string,
  maxPlayers: number,
  creatorClientId?: string
): RoomMetadata => {
  return {
    roomId,
    gameId,
    hostId: creatorPeerId,
    hostClientId: creatorClientId ?? creatorPeerId,
    hostName: creatorName,
    hostEpoch: 0,
    players: [
      {
        clientId: creatorClientId ?? creatorPeerId,
        peerId: creatorPeerId,
        displayName: creatorName,
        joinedAt: Date.now()
      }
    ],
    spectators: [],
    createdAt: Date.now(),
    maxPlayers
  };
};
