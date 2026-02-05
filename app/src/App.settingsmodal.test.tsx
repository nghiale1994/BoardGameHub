import { describe, expect, test, vi, beforeEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import type { RoomContextType } from "./hooks/useRoomContext";
import { App } from "./App";
import { renderWithI18n } from "./test/render";

vi.mock("./services/peerService", () => ({
  peerService: {
    onEvent: vi.fn(() => () => undefined)
  }
}));

const setMatchMedia = (matchesByQuery: Record<string, boolean>) => {
  window.matchMedia = (query: string) =>
    ({
      matches: Boolean(matchesByQuery[query]),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }) as unknown as MediaQueryList;
};

let mockRoom: RoomContextType;

const persistenceMock = vi.hoisted(() => ({
  subscribe: vi.fn(() => () => undefined),
  getPreference: vi.fn(async (_key: string, fallback: unknown) => fallback),
  setPreference: vi.fn(async () => undefined),
  getRecentRooms: vi.fn(async () => []),
  setRecentRooms: vi.fn(async () => undefined),
  upsertRecentRoom: vi.fn(async () => undefined),
  getDisplayName: vi.fn(async () => ""),
  setDisplayName: vi.fn(async () => undefined),
  clearAll: vi.fn(async () => undefined)
}));

vi.mock("./hooks/useRoomContext", () => ({
  useRoomContext: () => mockRoom
}));

vi.mock("./services/persistence", () => ({
  persistence: persistenceMock
}));

describe("SettingsModal entry points", () => {
  beforeEach(() => {
    setMatchMedia({
      "(min-width: 769px)": true,
      "(max-width: 767px)": false
    });

    mockRoom = {
      roomId: null,
      metadata: null,
      snapshot: null,
      ui: null,
      localPeerId: "peer_local",
      localClientId: "client_local",
      displayName: "Alice",
      displayNameReady: true,
      isHost: false,
      connectionStatus: "offline",
      connectedPeerIds: [],
      participantStatuses: {},
      messages: [],
      createRoom: vi.fn(async () => "ROOM123"),
      joinRoom: vi.fn(async () => undefined),
      leaveRoom: vi.fn(),
      updateLocalName: vi.fn(),
      requestRoleChange: vi.fn(),
      sendChatMessage: vi.fn()
    };

    window.history.replaceState({}, "", "/");
  });

  // Tests: HomePage sidebar Settings opens SettingsModal.
  // Steps:
  // 1) render HomePage
  // 2) open menu
  // 3) click Settings
  // 4) assert Settings dialog visible
  test("HomePage sidebar Settings opens SettingsModal", async () => {
    console.log("[test] SettingsModal entry: HomePage sidebar");

    // Step 1) render HomePage
    await renderWithI18n(<App />, { language: "en" });
    console.log("[test] rendered App");

    // Step 2) open menu
    console.log("[test] open sidebar menu");
    fireEvent.click(screen.getByRole("button", { name: "Open menu", hidden: true }));

    // Step 3) click Settings
    console.log("[test] click Settings");
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    // Step 4) assert Settings dialog visible
    console.log("[test] assert Settings dialog");
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
  });

  // Tests: GameRoom header Settings opens SettingsModal.
  // Steps:
  // 1) set in-room state
  // 2) render GameRoom
  // 3) click Settings in header
  // 4) assert Settings dialog visible
  test("GameRoom header Settings opens SettingsModal", async () => {
    console.log("[test] SettingsModal entry: GameRoom header");

    // Step 1) set in-room state
    mockRoom.roomId = "ROOM123";
    mockRoom.metadata = {
      roomId: "ROOM123",
      gameId: "catan",
      hostId: "ROOM123",
      hostClientId: "client_host",
      hostName: "Host",
      hostEpoch: 0,
      players: [{ clientId: "client_host", peerId: "ROOM123", displayName: "Host", joinedAt: 0 }],
      spectators: [],
      createdAt: 0,
      maxPlayers: 4
    };
    mockRoom.snapshot = {
      metadata: mockRoom.metadata,
      gameState: { phase: "setup" },
      version: 1,
      lastEventId: ""
    };
    mockRoom.ui = {
      roomId: "ROOM123",
      gameId: "catan",
      phase: "setup",
      canToggleRole: true,
      isHost: false,
      connectionStatus: "connected",
      hostId: "ROOM123",
      hostName: "Host",
      self: {
        peerId: "peer_local",
        clientId: "client_local",
        displayName: "Alice",
        role: "player",
        isSpectator: false
      },
      members: {
        players: [
          {
            peerId: "ROOM123",
            clientId: "client_host",
            displayName: "Host",
            role: "host",
            isSelf: false,
            isHost: true,
            status: "connected"
          },
          {
            peerId: "peer_local",
            clientId: "client_local",
            displayName: "Alice",
            role: "player",
            isSelf: true,
            isHost: false,
            status: "connected"
          }
        ],
        spectators: [],
        totalCount: 2
      }
    };

    // Step 2) render GameRoom
    await renderWithI18n(<App />, { language: "en" });
    console.log("[test] rendered App in room context");

    // Step 3) click Settings in header
    console.log("[test] click Settings");
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    // Step 4) assert Settings dialog visible
    console.log("[test] assert Settings dialog");
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
  });
});
