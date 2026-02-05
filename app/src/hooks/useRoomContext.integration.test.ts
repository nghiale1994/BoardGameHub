import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PeerEvent, PeerId, RoomMetadata, RoomSnapshot } from "../utils/types";
import type { ChatMessage } from "../utils/chat";
import { storage } from "../utils/storage";
import { useRoomContext } from "./useRoomContext";
import { peerService } from "../services/peerService";

type PeerEventListener = (event: PeerEvent) => void;

let eventListeners: PeerEventListener[] = [];
let connectionChangeListeners: Array<(peerId: PeerId, status: "connected" | "disconnected") => void> = [];
let currentPeerId: PeerId | null = null;
let connectedPeerIds: PeerId[] = [];

const emitPeerEvent = (event: PeerEvent) => {
  for (const listener of [...eventListeners]) listener(event);
};

vi.mock("../services/peerService", () => {
  return {
    peerService: {
      onEvent: vi.fn((listener: PeerEventListener) => {
        eventListeners.push(listener);
        return () => {
          eventListeners = eventListeners.filter((l) => l !== listener);
        };
      }),
      onConnectionChange: vi.fn((listener: (peerId: PeerId, status: "connected" | "disconnected") => void) => {
        connectionChangeListeners.push(listener);
        return () => {
          connectionChangeListeners = connectionChangeListeners.filter((l) => l !== listener);
        };
      }),
      // legacy API in older tests
      onConnection: vi.fn(() => () => undefined),

      getPeerId: vi.fn(() => currentPeerId),
      getPeerIds: vi.fn(() => connectedPeerIds),

      initialize: vi.fn(async (peerId: PeerId) => {
        currentPeerId = peerId;
      }),
      connectToPeer: vi.fn(async (peerId: PeerId) => {
        if (!connectedPeerIds.includes(peerId)) connectedPeerIds = [...connectedPeerIds, peerId];
        // Simulate a connection-change notification.
        for (const listener of [...connectionChangeListeners]) listener(peerId, "connected");
        return {};
      }),
      disconnect: vi.fn(() => {
        currentPeerId = null;
        connectedPeerIds = [];
      }),

      sendTo: vi.fn(),
      broadcast: vi.fn()
    }
  };
});

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

describe("useRoomContext integration (mock networking)", () => {
  beforeEach(() => {
    storage.clear();
    eventListeners = [];
    connectionChangeListeners = [];
    currentPeerId = null;
    connectedPeerIds = [];
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Tests: host join handler.
  // Steps:
  // 1) Restore host state from storage.
  // 2) Render the hook and confirm host baseline state.
  // 3) Emit join_request from a peer.
  // 4) Assert metadata updates and room_snapshot/presence_update are sent.
  test("host handles join_request and responds with room_snapshot", async () => {
    console.log("[test] useRoomContext host join_request handling");
    const roomId = "ROOM123";

    const metadata: RoomMetadata = {
      roomId,
      gameId: "catan",
      hostId: roomId,
      hostClientId: "c_host",
      hostName: "Host",
      hostEpoch: 0,
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

    // Step 1) Restore host state from storage.
    storage.setItem("currentRoomId", roomId);
    storage.setItem("roomMetadata", metadata);
    storage.setItem("roomSnapshot", snapshot);
    storage.setItem("activePeerId", roomId);
    storage.setItem("devicePeerId", roomId);
    storage.setItem("displayName", "Host");

    // Simulate already-initialized host runtime.
    currentPeerId = roomId;

    // Step 2) Render the hook and confirm host baseline state.
    const hook = renderHook(() => useRoomContext());

    await act(async () => {});
    expect(hook.result.current.roomId).toBe(roomId);
    expect(hook.result.current.isHost).toBe(true);
    expect(eventListeners.length).toBeGreaterThan(0);

    (peerService.broadcast as unknown as { mockClear: () => void }).mockClear();
    (peerService.sendTo as unknown as { mockClear: () => void }).mockClear();

    // Step 3) Emit join_request from a peer.
    await act(async () => {
      emitPeerEvent({
        type: "join_request",
        payload: { clientId: "c_join", displayName: "Alice", asSpectator: false },
        senderId: "peer_join" as PeerId,
        roomId,
        timestamp: Date.now(),
        hostEpoch: 0
      });
    });

    // Step 4) Assert metadata updates and room_snapshot/presence_update are sent.
    const players = hook.result.current.metadata?.players ?? [];
    expect(players.some((p) => p.clientId === "c_join" && p.peerId === "peer_join")).toBe(true);
    expect(hook.result.current.snapshot?.version).toBe(2);

    expect(peerService.sendTo).toHaveBeenCalledWith(
      "peer_join",
      expect.objectContaining({
        type: "room_snapshot",
        senderId: roomId,
        roomId,
        payload: expect.objectContaining({ snapshot: expect.any(Object) })
      })
    );

    expect(peerService.broadcast).toHaveBeenCalledWith(expect.objectContaining({ type: "room_snapshot" }));
    expect(peerService.broadcast).toHaveBeenCalledWith(expect.objectContaining({ type: "presence_update" }));
  });

  // Tests: joiner handshake.
  // Steps:
  // 1) Initialize joiner storage + displayName.
  // 2) Render hook and wait for displayName.
  // 3) Call joinRoom(roomId).
  // 4) Assert join_request was sent.
  // 5) Emit room_snapshot and await join completion.
  // 6) Assert hook state updates.
  test("joinRoom performs join handshake (join_request → room_snapshot)", async () => {
    console.log("[test] useRoomContext joinRoom handshake");
    const roomId = "ROOM123";
    const selfPeerId = "peer_self" as PeerId;

    // Step 1) Initialize joiner storage + displayName.
    persistenceMock.getDisplayName.mockResolvedValue("Alice");

    storage.setItem("devicePeerId", selfPeerId);
    storage.setItem("activePeerId", selfPeerId);

    // Step 2) Render hook and wait for displayName.
    const hook = renderHook(() => useRoomContext());

    await act(async () => {});
    expect(hook.result.current.localPeerId).toBe(selfPeerId);

    await waitFor(() => {
      expect(hook.result.current.displayName).toBe("Alice");
    });

    const selfClientId = hook.result.current.localClientId;

    const snapshot: RoomSnapshot = {
      metadata: {
        roomId,
        gameId: "catan",
        hostId: roomId,
        hostClientId: "c_host",
        hostName: "Host",
        hostEpoch: 0,
        players: [
          { clientId: "c_host", peerId: roomId, displayName: "Host", joinedAt: 0 },
          { clientId: selfClientId, peerId: selfPeerId, displayName: "Alice", joinedAt: 1 }
        ],
        spectators: [],
        createdAt: 0,
        maxPlayers: 4
      },
      gameState: { phase: "setup" },
      version: 1,
      lastEventId: ""
    };

    // Step 3) Call joinRoom(roomId).
    const promise = hook.result.current.joinRoom(roomId);

    // Let the join coroutine progress through initialize/connect/send.
    await act(async () => {
      await Promise.resolve();
    });

    // Step 4) Assert join_request was sent.
    expect(peerService.sendTo).toHaveBeenCalledWith(
      roomId,
      expect.objectContaining({
        type: "join_request",
        senderId: selfPeerId,
        roomId,
        payload: expect.objectContaining({
          clientId: selfClientId,
          displayName: "Alice",
          asSpectator: false
        })
      })
    );

    // Step 5) Emit room_snapshot and await join completion.
    await act(async () => {
      emitPeerEvent({
        type: "room_snapshot",
        payload: { snapshot },
        senderId: roomId,
        roomId,
        timestamp: Date.now(),
        hostEpoch: 0
      });
      await promise;
    });

    // Step 6) Assert hook state updates.
    expect(hook.result.current.roomId).toBe(roomId);
    expect(hook.result.current.metadata?.players.some((p) => p.clientId === selfClientId)).toBe(true);
  });

  // Tests: chat sync dedupes messages by id (reconnect/resend).
  // Steps:
  // 1) Restore joined peer state from storage.
  // 2) Render hook and wait for room baseline state.
  // 3) Emit chat_event twice with the same message.id.
  // 4) Assert messages are appended only once.
  test("chat_event dedupes messages by id (reconnect/resend)", async () => {
    console.log("[test] useRoomContext chat_event message id dedupe");
    const roomId = "ROOM123";
    const selfPeerId = "peer_self" as PeerId;
    const selfClientId = "c_self";

    const metadata: RoomMetadata = {
      roomId,
      gameId: "catan",
      hostId: roomId,
      hostClientId: "c_host",
      hostName: "Host",
      hostEpoch: 0,
      players: [
        { clientId: "c_host", peerId: roomId, displayName: "Host", joinedAt: 0 },
        { clientId: selfClientId, peerId: selfPeerId, displayName: "Alice", joinedAt: 1 }
      ],
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

    // Step 1) Restore joined peer state from storage.
    storage.setItem("currentRoomId", roomId);
    storage.setItem("roomMetadata", metadata);
    storage.setItem("roomSnapshot", snapshot);
    storage.setItem("activePeerId", selfPeerId);
    storage.setItem("devicePeerId", selfPeerId);
    storage.setItem("clientId", selfClientId);
    storage.setItem("displayName", "Alice");

    // Simulate already-initialized peer runtime.
    currentPeerId = selfPeerId;

    // Step 2) Render hook and wait for room baseline state.
    const hook = renderHook(() => useRoomContext());

    await act(async () => {});
    await waitFor(() => {
      expect(hook.result.current.roomId).toBe(roomId);
      expect(hook.result.current.metadata?.hostId).toBe(roomId);
    });

    const message: ChatMessage = {
      id: "msg_1",
      timestamp: 0,
      type: "user",
      senderId: "peer_other",
      senderName: "Carol",
      isSpectator: false,
      text: "hello"
    };

    // Step 3) Emit chat_event twice with the same message.id.
    await act(async () => {
      emitPeerEvent({
        type: "chat_event",
        payload: { message },
        senderId: roomId,
        roomId,
        timestamp: Date.now(),
        hostEpoch: 0
      });
      emitPeerEvent({
        type: "chat_event",
        payload: { message },
        senderId: roomId,
        roomId,
        timestamp: Date.now(),
        hostEpoch: 0
      });
    });

    // Step 4) Assert messages are appended only once.
    expect(hook.result.current.messages).toHaveLength(1);
    expect(hook.result.current.messages[0]).toEqual(message);
  });

  // Tests: host takeover reconciliation.
  // Steps:
  // 1) Enable fake timers and set system time.
  // 2) Seed storage with joined baseline metadata + snapshot.
  // 3) Render hook and confirm initial state is not host.
  // 4) Emit a baseline room_snapshot so takeover logic becomes eligible.
  // 5) Advance timers past takeover threshold and flush microtasks.
  // 6) Assert roomId claim + request_state was sent.
  // 7) Emit provide_state and advance timers to finish reconcile.
  // 8) Assert host epoch increments, snapshot chosen, and broadcasts happen.
  test("host takeover requests state and reconciles to best provided snapshot", async () => {
    console.log("[test] useRoomContext host takeover reconcile to best state");

    // Step 1) Enable fake timers and set system time.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));

    const roomId = "ROOM123";
    const selfPeerId = "peer_self" as PeerId;
    const selfClientId = "c_self";
    const otherPeerId = "peer_other" as PeerId;

    // Step 2) Seed storage with joined baseline metadata + snapshot.
    storage.setItem("clientId", selfClientId);
    storage.setItem("devicePeerId", selfPeerId);
    storage.setItem("activePeerId", selfPeerId);
    storage.setItem("displayName", "Alice");

    const metadata: RoomMetadata = {
      roomId,
      gameId: "catan",
      hostId: roomId,
      hostClientId: "c_host",
      hostName: "Host",
      hostEpoch: 0,
      players: [
        { clientId: "c_host", peerId: roomId, displayName: "Host", joinedAt: 0 },
        { clientId: selfClientId, peerId: selfPeerId, displayName: "Alice", joinedAt: 1 },
        { clientId: "c_other", peerId: otherPeerId, displayName: "Bob", joinedAt: 2 }
      ],
      spectators: [],
      createdAt: 0,
      maxPlayers: 4
    };

    const snapshot: RoomSnapshot = {
      metadata,
      gameState: { phase: "setup" },
      version: 3,
      lastEventId: ""
    };

    storage.setItem("currentRoomId", roomId);
    storage.setItem("roomMetadata", metadata);
    storage.setItem("roomSnapshot", snapshot);

    currentPeerId = selfPeerId;
    connectedPeerIds = [];

    // Step 3) Render hook and confirm initial state is not host.
    const hook = renderHook(() => useRoomContext());

    await act(async () => {});
    expect(hook.result.current.roomId).toBe(roomId);
    expect(hook.result.current.isHost).toBe(false);

    // Step 4) Emit a baseline room_snapshot so takeover logic becomes eligible.
    // Establish a joined baseline (hasJoinedSuccessfully + lastHostSignalAt) so takeover logic is eligible.
    await act(async () => {
      emitPeerEvent({
        type: "room_snapshot",
        payload: { snapshot },
        senderId: roomId,
        roomId,
        timestamp: Date.now(),
        hostEpoch: 0
      });
    });

    (peerService.broadcast as unknown as { mockClear: () => void }).mockClear();
    (peerService.sendTo as unknown as { mockClear: () => void }).mockClear();
    (peerService.initialize as unknown as { mockClear: () => void }).mockClear();

    // Step 5) Advance timers past takeover threshold and flush microtasks.
    // Advance past join grace + hard host-down threshold so takeover is attempted.
    await act(async () => {
      // Tick runs at t=0,3s,...,18s. We want to stop just after the 18s tick
      // so we can inject provide_state before the takeover sleep window ends.
      await vi.advanceTimersByTimeAsync(18_001);
    });

    // Flush any microtasks scheduled by takeover tick.
    await act(async () => {
      await Promise.resolve();
    });

    // Step 6) Assert roomId claim + request_state was sent.
    expect(peerService.initialize).toHaveBeenCalledWith(roomId, expect.objectContaining({ reason: "takeover:claim-roomId" }));

    const requestStateCall = (peerService.sendTo as unknown as { mock: { calls: unknown[][] } }).mock.calls.find(
      (call) => {
        const msg = call[1] as { type?: string };
        return msg?.type === "request_state";
      }
    ) as [PeerId, any] | undefined;

    expect(requestStateCall).toBeTruthy();

    const [requestTarget, requestMessage] = requestStateCall!;
    expect(requestTarget).toBe(otherPeerId);

    const requestId = requestMessage.payload.requestId as string;
    const targetHostEpoch = requestMessage.payload.targetHostEpoch as number;

    const providedSnapshot: RoomSnapshot = {
      metadata: {
        ...metadata,
        hostEpoch: 0
      },
      gameState: { phase: "from_peer" },
      version: 99,
      lastEventId: "x"
    };

    // Step 7) Emit provide_state and advance timers to finish reconcile.
    await act(async () => {
      emitPeerEvent({
        type: "provide_state",
        payload: { requestId, targetHostEpoch, snapshot: providedSnapshot },
        senderId: otherPeerId,
        roomId,
        timestamp: Date.now(),
        hostEpoch: targetHostEpoch
      } as PeerEvent);

      await vi.advanceTimersByTimeAsync(3_000);
    });

  // Step 8) Assert host epoch increments, snapshot chosen, and broadcasts happen.
    expect(hook.result.current.isHost).toBe(true);
    expect(hook.result.current.metadata?.hostEpoch).toBe(1);
    expect(hook.result.current.snapshot?.gameState).toEqual({ phase: "from_peer" });

    expect(peerService.broadcast).toHaveBeenCalledWith(expect.objectContaining({ type: "room_snapshot" }));
    expect(peerService.broadcast).toHaveBeenCalledWith(expect.objectContaining({ type: "presence_update" }));
  });
});
