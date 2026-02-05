import { describe, expect, test } from "vitest";
import { computePresenceStatusesFromHeartbeats } from "./presence";
import type { RoomMetadata } from "../utils/types";

const baseMetadata = (): RoomMetadata => ({
  roomId: "ROOM1",
  gameId: "catan",
  hostId: "ROOM1",
  hostClientId: "c_host",
  hostName: "Host",
  hostEpoch: 0,
  players: [
    { clientId: "c_host", peerId: "ROOM1", displayName: "Host", joinedAt: 0 },
    { clientId: "c_p1", peerId: "peer_p1", displayName: "Alice", joinedAt: 1 }
  ],
  spectators: [{ clientId: "c_s1", peerId: "peer_s1", displayName: "Spec", joinedAt: 2 }],
  createdAt: 0,
  maxPlayers: 4
});

describe("computePresenceStatusesFromHeartbeats", () => {
  // Tests: host clientId forced connected regardless of heartbeat age.
  // Steps:
  // 1) build metadata with hostClientId=c_host
  // 2) set lastSeen old for all clients
  // 3) compute statuses at now
  // 4) assert host connected and others offline
  test("marks host clientId as connected regardless of heartbeat age", () => {
    console.log("[test] presence host clientId forced connected");
    // Step 1) build metadata with hostClientId=c_host
    const metadata = baseMetadata();

    // Step 2) set lastSeen old for all clients
    const lastSeen = new Map<string, number>([
      ["c_host", 0],
      ["c_p1", 0],
      ["c_s1", 0]
    ]);

    const now = 1_000_000;
    // Step 3) compute statuses at now
    console.log("[test] compute statuses");
    const statuses = computePresenceStatusesFromHeartbeats({ metadata, lastSeenByClientId: lastSeen, now });

    // Step 4) assert host connected and others offline
    console.log("[test] assert statuses");
    expect(statuses.c_host).toBe("connected");
    expect(statuses.c_p1).toBe("offline");
    expect(statuses.c_s1).toBe("offline");
  });

  // Tests: thresholds for non-host clients.
  // Steps:
  // 1) build metadata
  // 2) set lastSeen times around thresholds
  // 3) compute statuses
  // 4) assert connected/reconnecting mapping
  test("uses thresholds: <=5s connected, <=20s reconnecting, else offline", () => {
    console.log("[test] presence thresholds connected/reconnecting/offline");
    // Step 1) build metadata
    const metadata = baseMetadata();

    const now = 100_000;
    // Step 2) set lastSeen times around thresholds
    const lastSeen = new Map<string, number>([
      ["c_p1", now - 5_000],
      ["c_s1", now - 20_000]
    ]);

    // Step 3) compute statuses
    console.log("[test] compute statuses");
    const statuses = computePresenceStatusesFromHeartbeats({ metadata, lastSeenByClientId: lastSeen, now });

    // Step 4) assert connected/reconnecting mapping
    console.log("[test] assert threshold mapping");
    expect(statuses.c_p1).toBe("connected");
    expect(statuses.c_s1).toBe("reconnecting");
  });

  // Tests: unknown transport ids in lastSeen do not create ghost presence; missing lastSeen defaults to reconnecting.
  // Steps:
  // 1) build metadata
  // 2) set lastSeen to include unknown peer/transport id only
  // 3) compute statuses
  // 4) assert known clients exist and default to reconnecting
  test("defaults unknown lastSeen to reconnecting (no ghost entries based on peerId)", () => {
    console.log("[test] presence defaults unknown lastSeen to reconnecting");
    // Step 1) build metadata
    const metadata = baseMetadata();

    const now = 100_000;
    // Step 2) set lastSeen to include unknown peer/transport id only
    const lastSeen = new Map<string, number>([
      // Unknown peer/transport id should not matter.
      ["peer_p1", now]
    ]);

    // Step 3) compute statuses
    console.log("[test] compute statuses");
    const statuses = computePresenceStatusesFromHeartbeats({ metadata, lastSeenByClientId: lastSeen, now });

    // Step 4) assert known clients exist and default to reconnecting
    console.log("[test] assert defaults + keys");
    expect(statuses.c_p1).toBe("reconnecting");
    expect(Object.keys(statuses)).toEqual(expect.arrayContaining(["c_host", "c_p1", "c_s1"]));
  });
});
