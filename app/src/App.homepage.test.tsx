import { describe, expect, test, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { RoomContextType } from "./hooks/useRoomContext";
import { App } from "./App";
import { renderWithI18n } from "./test/render";

let mockRoom: RoomContextType;
let persistenceSubscriber: ((message: unknown) => void) | null = null;
let recentRoomsState: Array<{ id: string; name: string; players: number; updatedAt: number }> = [];

const persistenceMock = vi.hoisted(() => ({
  subscribe: vi.fn((cb: (message: unknown) => void) => {
    persistenceSubscriber = cb;
    return () => {
      persistenceSubscriber = null;
    };
  }),
  getPreference: vi.fn(async (_key: string, fallback: unknown) => fallback),
  setPreference: vi.fn(async () => undefined),
  getRecentRooms: vi.fn(async () => recentRoomsState),
  setRecentRooms: vi.fn(async () => undefined),
  upsertRecentRoom: vi.fn(async ({ id, name, players }: { id: string; name: string; players: number }) => {
    const updatedAt = Date.now();
    recentRoomsState = [{ id, name, players, updatedAt }, ...recentRoomsState.filter((r) => r.id !== id)];
    persistenceSubscriber?.({ type: "pref_updated", key: "recentRooms" });
  })
}));

vi.mock("./hooks/useRoomContext", () => ({
  useRoomContext: () => mockRoom
}));

vi.mock("./services/persistence", () => ({
  persistence: persistenceMock
}));

describe("App (HomePage)", () => {
  beforeEach(() => {
    mockRoom = {
      roomId: null,
      metadata: null,
      snapshot: null,
      ui: null,
      localPeerId: "peer_local",
      localClientId: "client_local",
      displayName: "",
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

    persistenceMock.subscribe.mockClear();
    persistenceMock.getPreference.mockClear();
    persistenceMock.setPreference.mockClear();
    persistenceMock.getRecentRooms.mockClear();
    persistenceMock.setRecentRooms.mockClear();
    persistenceMock.upsertRecentRoom.mockClear();

    persistenceSubscriber = null;
    recentRoomsState = [];

    window.history.replaceState({}, "", "/");
  });

  // Tests: invite route pre-fills JoinRoom and focuses the input.
  // Steps:
  // 1) set URL `/i/:id`
  // 2) render App
  // 3) assert input value ends with `/i/:id`
  // 4) assert input is focused
  test("invite route pre-fills JoinRoom and focuses input", async () => {
    console.log("[test] App(HomePage) invite route prefill + focus");

    // Step 1) set URL `/i/:id`
    window.history.replaceState({}, "", "/i/ABC123");
    console.log("[test] set location: /i/ABC123");

    // Step 2) render App
    await renderWithI18n(<App />, { language: "en" });
    console.log("[test] rendered App");

    const input = screen.getByPlaceholderText("Paste room URL") as HTMLInputElement;
    // Step 3) assert input value ends with `/i/:id`
    console.log("[test] assert JoinRoom input value ends with /i/ABC123");
    await waitFor(() => {
      expect(input.value).toMatch(/\/i\/ABC123$/);
    });

    // Step 4) assert input is focused
    console.log("[test] assert JoinRoom input is focused");
    await waitFor(() => {
      expect(document.activeElement).toBe(input);
    });
  });

  // Tests: legacy `/r/:id` migrates to `/i/:id` and pre-fills JoinRoom.
  // Steps:
  // 1) set URL `/r/:id`
  // 2) render App
  // 3) wait for pathname rewrite to `/i/:id`
  // 4) assert JoinRoom input prefilled with `/i/:id`
  test("legacy /r/:id route is migrated to /i/:id", async () => {
    console.log("[test] App(HomePage) legacy /r -> /i migration");

    // Step 1) set URL `/r/:id`
    window.history.replaceState({}, "", "/r/LEGACY123");
    console.log("[test] set location: /r/LEGACY123");

    // Step 2) render App
    await renderWithI18n(<App />, { language: "en" });
    console.log("[test] rendered App");

    // Step 3) wait for pathname rewrite to `/i/:id`
    console.log("[test] assert pathname migrated to /i/LEGACY123");
    await waitFor(() => {
      expect(window.location.pathname).toBe("/i/LEGACY123");
    });
    const input = screen.getByPlaceholderText("Paste room URL") as HTMLInputElement;

    // Step 4) assert JoinRoom input prefilled with `/i/:id`
    console.log("[test] assert JoinRoom input prefilled with /i/LEGACY123");
    await waitFor(() => {
      expect(input.value).toMatch(/\/i\/LEGACY123$/);
    });
  });

  // Tests: name gate blocks joining when display name is empty.
  // Steps:
  // 1) render App
  // 2) fill room id
  // 3) click Join
  // 4) assert error text and joinRoom not called
  test("name gate blocks join and shows error", async () => {
    console.log("[test] App(HomePage) name gate blocks join");

    // Step 1) render App
    await renderWithI18n(<App />, { language: "en" });

    // Step 2) fill room id
    // Step 3) click Join
    console.log("[test] fill room input + click Join");
    fireEvent.change(screen.getByPlaceholderText("Paste room URL"), { target: { value: "ROOMID" } });
    fireEvent.click(screen.getByRole("button", { name: "Join" }));

    // Step 4) assert error text and joinRoom not called
    console.log("[test] assert error + joinRoom not called");
    expect(screen.getByText("Please enter and save your name before continuing.")).toBeInTheDocument();
    expect(mockRoom.joinRoom).not.toHaveBeenCalled();
  });

  // Tests: create flow opens modal and calls createRoom.
  // Steps:
  // 1) set displayName
  // 2) render App
  // 3) click game card
  // 4) click Create Room
  // 5) assert createRoom args
  // 6) assert Room created modal and recent-room persistence
  test("create flow opens modal and calls createRoom", async () => {
    console.log("[test] App(HomePage) create flow opens modal + calls createRoom");

    // Step 1) set displayName
    mockRoom.displayName = "Alice";

    // Step 2) render App
    await renderWithI18n(<App />, { language: "en" });

    // Step 3) click game card
    console.log("[test] click game card: Catan");
    fireEvent.click(screen.getByText("Catan"));
    expect(await screen.findByRole("dialog", { name: "Create new room" })).toBeInTheDocument();

    // Step 4) click Create Room
    console.log("[test] click Create Room");
    fireEvent.click(screen.getByRole("button", { name: "Create Room" }));

    // Step 5) assert createRoom args
    console.log("[test] assert createRoom called with gameId/maxPlayers");
    await waitFor(() => {
      expect(mockRoom.createRoom).toHaveBeenCalledWith("catan", 4);
    });

    // Step 6) assert Room created modal and recent-room persistence
    console.log("[test] assert Room created modal + recent room persistence");
    expect(await screen.findByRole("dialog", { name: "Room created" })).toBeInTheDocument();
    expect(persistenceMock.upsertRecentRoom).toHaveBeenCalledWith({
      id: "ROOM123",
      name: "Catan",
      players: 4
    });
  });

  // Tests: create flow updates RecentGames UI after persistence broadcast.
  // Steps:
  // 1) set displayName and render App
  // 2) create room
  // 3) dismiss Room created modal
  // 4) assert RecentGames shows Resume
  test("create flow updates RecentGames UI", async () => {
    console.log("[test] App(HomePage) create flow updates RecentGames");

    // Step 1) set displayName and render App
    mockRoom.displayName = "Alice";
    await renderWithI18n(<App />, { language: "en" });

    // Step 2) create room
    console.log("[test] click game card: Catan");
    fireEvent.click(screen.getByText("Catan"));
    expect(await screen.findByRole("dialog", { name: "Create new room" })).toBeInTheDocument();
    console.log("[test] click Create Room");
    fireEvent.click(screen.getByRole("button", { name: "Create Room" }));

    // Close the confirmation modal so underlying homepage content is accessible.
    expect(await screen.findByRole("dialog", { name: "Room created" })).toBeInTheDocument();
    // Step 3) dismiss Room created modal
    console.log("[test] dismiss Room created modal");
    fireEvent.click(screen.getByRole("button", { name: "Later" }));

    console.log("[test] wait for Room created modal to close");
    await waitFor(() => {
      const dialog = screen.queryByRole("dialog", { name: "Room created" });
      if (dialog) expect(dialog).not.toBeVisible();
      else expect(dialog).toBeNull();
    });

    // Step 4) assert RecentGames shows Resume
    // RecentGames should eventually reflect the new entry via mocked persistence broadcast.
    console.log("[test] wait for RecentGames Resume button");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Resume", hidden: true })).toBeInTheDocument();
    });
  });
});
