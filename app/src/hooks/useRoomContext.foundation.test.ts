import { describe, expect, test, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRoomContext } from "./useRoomContext";
import { storage } from "../utils/storage";
import type { PeerEvent, RoomMetadata, RoomSnapshot } from "../utils/types";

let peerEventListener: ((event: PeerEvent) => void) | null = null;

vi.mock("../services/peerService", () => ({
  peerService: {
    onEvent: vi.fn((listener: (event: PeerEvent) => void) => {
      peerEventListener = listener;
      return () => {
        peerEventListener = null;
      };
    }),
    onConnection: vi.fn(() => () => undefined),
    onConnectionChange: vi.fn(() => () => undefined),
    getPeerId: vi.fn(() => null),
    getPeerIds: vi.fn(() => []),
    sendTo: vi.fn(),
    broadcast: vi.fn(),
    initialize: vi.fn(async () => undefined),
    connectToPeer: vi.fn(async () => ({})),
    disconnect: vi.fn()
  }
}));

const persistenceMock = vi.hoisted(() => ({
  subscribe: vi.fn(() => () => undefined),
  getDisplayName: vi.fn(async () => ""),
  setDisplayName: vi.fn(async () => undefined),
  getPreference: vi.fn(async (_key: string, fallback: unknown) => fallback),
  setPreference: vi.fn(async () => undefined),
  clearAll: vi.fn(async () => undefined)
}));

vi.mock("../services/persistence", () => ({
  persistence: persistenceMock
}));

describe("useRoomContext foundations", () => {
  beforeEach(() => {
    storage.clear();
    peerEventListener = null;
  });

  // Tests: localClientId is stable across remounts.
  // Steps:
  // 1) Render hook, capture localClientId, then unmount.
  // 2) Render hook again and capture localClientId.
  // 3) Assert ids are truthy and equal.
  test("clientId is stable across remounts", () => {
    console.log("[test] useRoomContext clientId stable across remounts");

    // Step 1) Render hook, capture localClientId, then unmount.
    const first = renderHook(() => useRoomContext());
    const id1 = first.result.current.localClientId;
    first.unmount();

    // Step 2) Render hook again and capture localClientId.
    const second = renderHook(() => useRoomContext());
    const id2 = second.result.current.localClientId;

    // Step 3) Assert ids are truthy and equal.
    console.log("[test] assert ids are truthy and equal");
    expect(id1).toBeTruthy();
    expect(id2).toBe(id1);
  });

  // Tests: ignores events from older hostEpoch.
  // Steps:
  // 1) Seed storage with a snapshot at hostEpoch=2.
  // 2) Render hook and wait for listener + initial state.
  // 3) Emit chat_event with hostEpoch=1.
  // 4) Assert message is not applied.
  // 5) Emit chat_event with hostEpoch=2.
  // 6) Wait for message to be applied.
  test("ignores events from older hostEpoch", async () => {
    console.log("[test] useRoomContext ignores older hostEpoch events");
    const roomId = "ROOM123";

    const metadata: RoomMetadata = {
      roomId,
      gameId: "catan",
      hostId: roomId,
      hostClientId: "c_host",
      hostName: "Host",
      hostEpoch: 2,
      players: [{ clientId: "c_host", peerId: roomId, displayName: "Host", joinedAt: 0 }],
      spectators: [],
      createdAt: 0,
      maxPlayers: 4
    };

    const snapshot: RoomSnapshot = {
      metadata,
      gameState: { phase: "setup" },
      version: 1,
      lastEventId: ""
    };

    // Step 1) Seed storage with a snapshot at hostEpoch=2.
    storage.setItem("currentRoomId", roomId);
    storage.setItem("roomMetadata", metadata);
    storage.setItem("roomSnapshot", snapshot);
    console.log("[test] seeded storage with roomId + metadata + snapshot(hostEpoch=2)");

    // Step 2) Render hook and wait for listener + initial state.
    const hook = renderHook(() => useRoomContext());

    console.log("[test] wait for listener + initial state");
    await waitFor(() => {
      expect(peerEventListener).not.toBeNull();
      expect(hook.result.current.roomId).toBe(roomId);
      expect(hook.result.current.metadata?.hostEpoch).toBe(2);
    });

    // Step 3) Emit chat_event with hostEpoch=1.
    console.log("[test] emit chat_event with hostEpoch=1 (should be ignored)");
    act(() => {
      peerEventListener?.({
        type: "chat_event",
        payload: {
          message: {
            id: "m1",
            timestamp: 0,
            type: "user",
            senderId: "peer_other",
            senderName: "Other",
            isSpectator: false,
            text: "old"
          }
        },
        senderId: roomId,
        timestamp: 0,
        roomId,
        hostEpoch: 1
      });
    });

    // Step 4) Assert message is not applied.
    console.log("[test] assert no messages applied");
    expect(hook.result.current.messages).toHaveLength(0);

    // Step 5) Emit chat_event with hostEpoch=2.
    console.log("[test] emit chat_event with hostEpoch=2 (should apply)");
    act(() => {
      peerEventListener?.({
        type: "chat_event",
        payload: {
          message: {
            id: "m2",
            timestamp: 0,
            type: "user",
            senderId: "peer_other",
            senderName: "Other",
            isSpectator: false,
            text: "new"
          }
        },
        senderId: roomId,
        timestamp: 0,
        roomId,
        hostEpoch: 2
      });
    });

    // Step 6) Wait for message to be applied.
    console.log("[test] await message applied");
    await waitFor(() => {
      expect(hook.result.current.messages).toHaveLength(1);
      expect(hook.result.current.messages[0]?.type).toBe("user");
    });
  });
});
