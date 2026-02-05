import { describe, expect, test, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { RoomContextType } from "./hooks/useRoomContext";
import { App } from "./App";
import { renderWithI18n } from "./test/render";
import { storage } from "./utils/storage";

vi.mock("./services/peerService", () => ({
  peerService: {
    onEvent: vi.fn(() => () => undefined)
  }
}));

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

describe("App (GameRoom)", () => {
  beforeEach(() => {
    storage.clear();

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

    persistenceMock.getPreference.mockClear();
    persistenceMock.setPreference.mockClear();

    window.history.replaceState({}, "", "/");
  });

  // Tests: opening `/room/:id` without join prefs redirects to Home.
  // Steps:
  // 1) set URL to `/room/:id` (no join prefs)
  // 2) render App
  // 3) assert pathname becomes `/`
  test("/room/:roomId without join prefs redirects to Home", async () => {
    console.log("[test] App(GameRoom) /room without prefs redirects to /");

    // Step 1) set URL to `/room/:id` (no join prefs)
    window.history.replaceState({}, "", "/room/NOPREFS");
    console.log("[test] set location: /room/NOPREFS");

    // Step 2) render App
    await renderWithI18n(<App />, { language: "en" });
    console.log("[test] rendered App");

    // Step 3) assert pathname becomes `/`
    console.log("[test] wait for redirect");
    await waitFor(() => {
      expect(window.location.pathname).toBe("/");
    });
  });

  // Tests: refresh on `/room/:id` auto-rejoin uses stored prefs and stays on `/room/:id` when join fails.
  // Steps:
  // 1) set `roomJoinPrefs` for roomId
  // 2) set URL `/room/:id`
  // 3) mock joinRoom to throw
  // 4) render App
  // 5) assert joinRoom called with stored prefs
  // 6) assert pathname remains `/room/:id`
  test("/room/:roomId refresh auto-rejoin uses stored prefs and stays on /room/:id on failure", async () => {
    console.log("[test] App(GameRoom) refresh auto-rejoin uses prefs and stays on /room when join fails");

    // Step 1) set `roomJoinPrefs` for roomId
    storage.setItem("roomJoinPrefs", {
      ROOM123: { asSpectator: true, updatedAt: Date.now() }
    });
    console.log("[test] set roomJoinPrefs for ROOM123 asSpectator=true");

    // Step 3) mock joinRoom to throw
    mockRoom.roomId = "ROOM123";
    mockRoom.connectionStatus = "reconnecting";
    mockRoom.isHost = false;
    mockRoom.joinRoom = vi.fn(async () => {
      throw new Error("host offline");
    });

    // Step 2) set URL `/room/:id`
    window.history.replaceState({}, "", "/room/ROOM123");
    console.log("[test] set location: /room/ROOM123");

    // Step 4) render App
    await renderWithI18n(<App />, { language: "en" });
    console.log("[test] rendered App");

    // Step 5) assert joinRoom called with stored prefs
    console.log("[test] wait for joinRoom called with stored prefs");
    await waitFor(() => {
      expect(mockRoom.joinRoom).toHaveBeenCalledWith("ROOM123", { asSpectator: true });
    });

    // Step 6) assert pathname remains `/room/:id`
    console.log("[test] assert pathname remains /room/ROOM123");
    expect(window.location.pathname).toBe("/room/ROOM123");
  });

  // Tests: Settings chat flags toggles affect GameRoom chat rendering.
  // Steps:
  // 1) render in-room with messages
  // 2) open Chat
  // 3) assert user+move+system visible
  // 4) open Settings
  // 5) toggle Show conversation off
  // 6) toggle Show game events off
  // 7) close Settings
  // 8) assert user+move hidden and system still visible
  // 9) assert preferences persisted
  test("Settings chat flags toggle affects GameRoom chat rendering", async () => {
    console.log("[test] App(GameRoom) Settings chat flags update rendering + persistence");
    mockRoom.roomId = "ROOM123";
    mockRoom.metadata = {
      roomId: "ROOM123",
      gameId: "catan",
      hostId: "ROOM123",
      hostClientId: "client_host",
      hostName: "Host",
      hostEpoch: 0,
      players: [
        { clientId: "client_host", peerId: "ROOM123", displayName: "Host", joinedAt: 0 },
        { clientId: "client_local", peerId: "peer_local", displayName: "Alice", joinedAt: 1 }
      ],
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
    mockRoom.messages = [
      {
        id: "u1",
        timestamp: 0,
        type: "user",
        senderId: "peer_other",
        senderName: "Carol",
        isSpectator: false,
        text: "hello"
      },
      {
        id: "m1",
        timestamp: 0,
        type: "move",
        actorName: "Carol",
        actionText: "placed a tile"
      },
      {
        id: "s1",
        timestamp: 0,
        type: "system",
        kind: "joined",
        actorName: "Alice"
      }
    ];

    // Step 1) render in-room with messages
    await renderWithI18n(<App />, { language: "en" });
    console.log("[test] rendered App in room context");

    // Step 2) open Chat
    console.log("[test] open Chat tab");
    fireEvent.click(screen.getByRole("tab", { name: /^Chat/i }));

    // Step 3) assert user+move+system visible
    console.log("[test] assert messages visible before filters");
    expect(screen.getByText("hello")).toBeInTheDocument();
    expect(screen.getByText(/Carol.*placed a tile/i)).toBeInTheDocument();
    expect(screen.getByText("Alice joined the room")).toBeInTheDocument();

    // Step 4) open Settings
    console.log("[test] open Settings modal");
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    const conversation = screen.getByLabelText("Show conversation");
    // Step 5) toggle Show conversation off
    console.log("[test] toggle Show conversation off");
    fireEvent.click(conversation);

    const gameEvents = screen.getByLabelText("Show game events");
    // Step 6) toggle Show game events off
    console.log("[test] toggle Show game events off");
    fireEvent.click(gameEvents);

    // Close modal.
    // Step 7) close Settings
    console.log("[test] close Settings modal");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    // Step 8) assert user+move hidden and system still visible
    console.log("[test] assert user/move hidden and system remains");
    expect(screen.queryByText("hello")).toBeNull();
    expect(screen.queryByText(/Carol.*placed a tile/i)).toBeNull();
    expect(screen.getByText("Alice joined the room")).toBeInTheDocument();

    // Step 9) assert preferences persisted
    console.log("[test] assert preferences persisted");
    await waitFor(() => {
      expect(persistenceMock.setPreference).toHaveBeenCalledWith("chat.showConversation", false);
      expect(persistenceMock.setPreference).toHaveBeenCalledWith("chat.showGameEvents", false);
    });
  });
});
