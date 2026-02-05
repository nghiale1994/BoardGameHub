import { describe, expect, test, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { RecentGames } from "./RecentGames";
import { renderWithI18n } from "../test/render";
import type { RecentRoom } from "../services/persistence";

let roomsState: RecentRoom[] = [];
let subscriber: ((message: unknown) => void) | null = null;

const persistenceMock = vi.hoisted(() => ({
  getRecentRooms: vi.fn(async () => roomsState),
  setRecentRooms: vi.fn(async (rooms: RecentRoom[]) => {
    roomsState = rooms;
  }),
  subscribe: vi.fn((cb: (message: unknown) => void) => {
    subscriber = cb;
    return () => {
      subscriber = null;
    };
  })
}));

vi.mock("../services/persistence", () => ({
  persistence: persistenceMock
}));

describe("RecentGames", () => {
  // Tests: empty state.
  // Steps:
  // 1) set roomsState=[]
  // 2) render RecentGames
  // 3) assert header and empty message
  test("renders empty state", async () => {
    console.log("[test] RecentGames renders empty state");

    // Step 1) set roomsState=[]
    roomsState = [];

    // Step 2) render RecentGames
    await renderWithI18n(<RecentGames />, { language: "en" });

    // Step 3) assert header and empty message
    console.log("[test] assert empty UI");
    expect(screen.getByText("Recent rooms")).toBeInTheDocument();
    expect(screen.getByText("No recent rooms")).toBeInTheDocument();
  });

  // Tests: renders rooms + Resume calls onResume.
  // Steps:
  // 1) set roomsState=[ROOM1]
  // 2) render RecentGames with onResume
  // 3) await room name
  // 4) click Resume
  // 5) assert callback gets ROOM1
  test("renders rooms and Resume triggers callback", async () => {
    console.log("[test] RecentGames renders rooms and Resume triggers callback");
    const onResume = vi.fn();

    // Step 1) set roomsState=[ROOM1]
    roomsState = [
      { id: "ROOM1", name: "Catan", players: 4, updatedAt: Date.now() - 60_000 }
    ];

    // Step 2) render RecentGames with onResume
    await renderWithI18n(<RecentGames onResume={onResume} />, { language: "en" });

    // Step 3) await room name
    console.log("[test] await room name");
    expect(await screen.findByText("Catan")).toBeInTheDocument();

    // Step 4) click Resume
    console.log("[test] click Resume");
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));

    // Step 5) assert callback gets ROOM1
    console.log("[test] assert onResume called with ROOM1");
    expect(onResume).toHaveBeenCalledWith("ROOM1");
  });

  // Tests: Clear all persists and updates UI.
  // Steps:
  // 1) set roomsState=[ROOM1]
  // 2) render RecentGames
  // 3) await existing room
  // 4) click Clear all
  // 5) assert persistence.setRecentRooms([])
  // 6) assert empty message
  test("clear all persists and updates UI", async () => {
    console.log("[test] RecentGames clear all persists and updates UI");

    // Step 1) set roomsState=[ROOM1]
    roomsState = [
      { id: "ROOM1", name: "Catan", players: 4, updatedAt: Date.now() - 60_000 }
    ];

    // Step 2) render RecentGames
    await renderWithI18n(<RecentGames />, { language: "en" });

    // Step 3) await existing room
    console.log("[test] await existing room");
    expect(await screen.findByText("Catan")).toBeInTheDocument();

    // Step 4) click Clear all
    console.log("[test] click Clear all");
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));

    // Step 5) assert persistence.setRecentRooms([])
    console.log("[test] assert persistence setRecentRooms([])");
    await waitFor(() => {
      expect(persistenceMock.setRecentRooms).toHaveBeenCalledWith([]);
    });

    // Step 6) assert empty message
    console.log("[test] assert empty UI");
    expect(screen.getByText("No recent rooms")).toBeInTheDocument();
  });

  // Tests: reloads rooms when persistence broadcasts recentRooms update.
  // Steps:
  // 1) set roomsState=[] and render RecentGames
  // 2) assert empty UI
  // 3) update roomsState with ROOM2
  // 4) invoke subscriber({type:'pref_updated', key:'recentRooms'})
  // 5) assert new room is rendered
  test("reloads rooms when persistence broadcasts recentRooms update", async () => {
    console.log("[test] RecentGames reloads rooms on persistence broadcast");

    // Step 1) set roomsState=[] and render RecentGames
    roomsState = [];
    await renderWithI18n(<RecentGames />, { language: "en" });

    // Step 2) assert empty UI
    console.log("[test] assert empty UI");
    expect(screen.getByText("No recent rooms")).toBeInTheDocument();

    // Step 3) update roomsState with ROOM2
    roomsState = [{ id: "ROOM2", name: "Azul", players: 2, updatedAt: Date.now() }];

    // Step 4) invoke subscriber({type:'pref_updated', key:'recentRooms'})
    console.log("[test] simulate persistence pref_updated recentRooms");
    subscriber?.({ type: "pref_updated", key: "recentRooms" });

    // Step 5) assert new room is rendered
    console.log("[test] assert new room rendered");
    await waitFor(() => {
      expect(screen.getByText("Azul")).toBeInTheDocument();
    });
  });
});
