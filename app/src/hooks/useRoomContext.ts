import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PeerId, RoomMetadata, RoomSnapshot } from "../utils/types";
import { storage } from "../utils/storage";
import { persistence } from "../services/persistence";
import { generateRoomId, initializeRoomMetadata } from "../services/roomHelpers";
import { peerService } from "../services/peerService";
import { normalizeDisplayName } from "../utils/displayName";
import type { ChatMessage, SystemMessageKind } from "../utils/chat";
import { createId } from "../utils/chat";
import { projectRoomUiModel, type PresenceStatus, type RoomUIModel } from "../services/roomUiProjection";
import { computePresenceStatusesFromHeartbeats } from "../services/presence";

type RoomJoinPrefs = Record<
  string,
  {
    asSpectator: boolean;
    updatedAt: number;
  }
>;

const ROOM_JOIN_PREFS_STORAGE_KEY = "roomJoinPrefs";

const getRoomJoinPrefs = (): RoomJoinPrefs => {
  return storage.getItem<RoomJoinPrefs>(ROOM_JOIN_PREFS_STORAGE_KEY, {}) ?? {};
};

const setRoomJoinPref = (roomId: string, asSpectator: boolean) => {
  const next = getRoomJoinPrefs();
  next[roomId] = { asSpectator, updatedAt: Date.now() };
  storage.setItem(ROOM_JOIN_PREFS_STORAGE_KEY, next);
};

const normalizeRoomMetadata = (value: RoomMetadata | null): RoomMetadata | null => {
  if (!value) return null;
  const raw = value as unknown as Record<string, unknown>;
  const hostEpoch = typeof raw.hostEpoch === "number" ? raw.hostEpoch : 0;

  const normalizeParticipant = (p: { peerId: PeerId; displayName: string; joinedAt: number } & Record<string, unknown>) => {
    const clientId = typeof p.clientId === "string" && p.clientId.trim().length > 0 ? p.clientId : p.peerId;
    return { ...p, clientId };
  };

  const players = (value.players ?? []).map((p) => normalizeParticipant(p as never));
  const spectators = (value.spectators ?? []).map((s) => normalizeParticipant(s as never));

  const hostClientIdRaw = typeof raw.hostClientId === "string" ? raw.hostClientId.trim() : "";
  const inferredHostClientId =
    hostClientIdRaw ||
    players.find((p) => p.peerId === value.hostId)?.clientId ||
    spectators.find((s) => s.peerId === value.hostId)?.clientId ||
    value.hostId;

  return {
    ...value,
    hostEpoch,
    hostClientId: inferredHostClientId,
    players,
    spectators
  };
};

const normalizeRoomSnapshot = (value: RoomSnapshot | null): RoomSnapshot | null => {
  if (!value) return null;
  return { ...value, metadata: normalizeRoomMetadata(value.metadata)! };
};

export type RoomContextType = {
  roomId: string | null;
  metadata: RoomMetadata | null;
  snapshot: RoomSnapshot | null;
  ui: RoomUIModel | null;
  localPeerId: PeerId;
  localClientId: string;
  displayName: string;
  displayNameReady: boolean;
  isHost: boolean;
  connectionStatus: "connected" | "reconnecting" | "offline";
  connectedPeerIds: PeerId[];
  participantStatuses: Record<string, "connected" | "reconnecting" | "offline">;
  messages: ChatMessage[];

  createRoom: (gameId: string, maxPlayers: number) => Promise<string>;
  joinRoom: (roomId: string, options?: { asSpectator?: boolean }) => Promise<void>;
  leaveRoom: () => void;
  updateLocalName: (name: string) => void;
  requestRoleChange: (asSpectator: boolean) => void;
  sendChatMessage: (text: string) => void;
};

type JoinRequestPayload = {
  clientId?: string;
  displayName: string;
  asSpectator: boolean;
};

type RoleChangeRequestPayload = {
  asSpectator: boolean;
};

type LeaveNoticePayload = {
  displayName: string;
};

type ChatEventPayload = {
  message: ChatMessage;
};

type HeartbeatPayload = {
  clientId?: string;
};

type PresenceUpdatePayload = {
  statuses: Record<string, PresenceStatus>;
};

type RequestStatePayload = {
  requestId: string;
  targetHostEpoch: number;
  knownVersion: number;
};

type ProvideStatePayload = {
  requestId: string;
  targetHostEpoch: number;
  snapshot: RoomSnapshot;
};

type RoomSnapshotPayload = {
  snapshot: RoomSnapshot;
};

const isE2EPeerDisabled = () => {
  const env = import.meta.env as unknown as Record<string, string | undefined>;
  const value = env.VITE_E2E_DISABLE_PEERJS;
  return value === "1" || value === "true";
};

/**
 * Context state management hook for room lifecycle.
 */
export const useRoomContext = () => {
  const clientIdRef = useRef<string>(
    (() => {
      const stored = storage.getItem<string>("clientId", null);
      if (stored && stored.trim().length > 0) return stored;
      const generated = `c_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      storage.setItem("clientId", generated);
      return generated;
    })()
  );

  const [roomId, setRoomId] = useState<string | null>(() =>
    storage.getItem<string | null>("currentRoomId", null)
  );
  const [metadata, setMetadata] = useState<RoomMetadata | null>(() =>
    normalizeRoomMetadata(storage.getItem<RoomMetadata | null>("roomMetadata", null))
  );
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(() =>
    normalizeRoomSnapshot(storage.getItem<RoomSnapshot | null>("roomSnapshot", null))
  );
  const [displayName, setDisplayName] = useState<string>(() =>
    storage.getItem<string>("displayName", "") ?? ""
  );

  const [displayNameReady, setDisplayNameReady] = useState<boolean>(() => {
    const stored = storage.getItem<string>("displayName", "") ?? "";
    return stored.trim().length > 0;
  });

  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "reconnecting" | "offline"
  >("offline");

  const [connectedPeerIds, setConnectedPeerIds] = useState<PeerId[]>([]);

  // Host liveness tracking (used to determine reconnecting/offline without relying on PeerJS connection teardown).
  const lastHostSignalAtRef = useRef<number | null>(null);
  const roomEnteredAtRef = useRef<number>(Date.now());
  const hasJoinedSuccessfullyRef = useRef<boolean>(false);
  const lastClaimAttemptAtRef = useRef<number>(0);

  const [participantStatuses, setParticipantStatuses] = useState<Record<string, PresenceStatus>>({});
  const lastSeenByClientIdRef = useRef<Map<string, number>>(new Map());
  const lastPresenceBroadcastRef = useRef<string>("");

  // During host takeover, the new host requests snapshots from peers and chooses the best.
  // We keep an inbox keyed by requestId for a short period.
  const stateTransferInboxRef = useRef<Map<string, RoomSnapshot[]>>(new Map());

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const devicePeerIdRef = useRef<PeerId>(
    (() => {
      const stored = storage.getItem<PeerId>("devicePeerId", null);
      if (stored) return stored;
      const generated = `peer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      storage.setItem("devicePeerId", generated);
      return generated;
    })()
  );

  const [activePeerId, setActivePeerId] = useState<PeerId>(() => {
    return storage.getItem<PeerId>("activePeerId", devicePeerIdRef.current) ?? devicePeerIdRef.current;
  });

  useEffect(() => {
    storage.setItem("activePeerId", activePeerId);
  }, [activePeerId]);

  const roomIdRef = useRef(roomId);
  const metadataRef = useRef(metadata);
  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    roomIdRef.current = roomId;
    lastHostSignalAtRef.current = null;
    hasJoinedSuccessfullyRef.current = false;
    if (roomId) roomEnteredAtRef.current = Date.now();
  }, [roomId]);
  useEffect(() => {
    metadataRef.current = metadata;
  }, [metadata]);
  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const isHost = metadata?.hostId === activePeerId;

  const applyNormalizedSnapshot = useCallback((currentRoomId: string, normalized: RoomSnapshot) => {
    storage.setItem("currentRoomId", currentRoomId);
    storage.setItem("roomMetadata", normalized.metadata);
    storage.setItem("roomSnapshot", normalized);
    setRoomId(currentRoomId);
    setMetadata(normalized.metadata);
    setSnapshot(normalized);
  }, []);

  const ui: RoomUIModel | null = useMemo(() => {
    if (!roomId || !metadata) return null;

    return projectRoomUiModel({
      roomId,
      metadata,
      snapshot,
      localPeerId: activePeerId,
      localClientId: clientIdRef.current,
      localDisplayName: displayName,
      isHost: Boolean(isHost),
      connectionStatus,
      participantStatuses
    });
  }, [activePeerId, connectionStatus, displayName, isHost, metadata, participantStatuses, roomId, snapshot]);

  const performJoin = useCallback(
    async (
      incomingRoomId: string,
      asSpectator: boolean,
      options?: { preferredPeerId?: PeerId }
    ): Promise<RoomSnapshot> => {
      const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

      const snapshotIncludesSelf = (snapshot: RoomSnapshot, expectedPeerId: PeerId) => {
        const expectedClientId = clientIdRef.current;
        const players = snapshot.metadata.players ?? [];
        const spectators = snapshot.metadata.spectators ?? [];
        return [...players, ...spectators].some((p) => p.clientId === expectedClientId || p.peerId === expectedPeerId);
      };

      const initWithFallback = async (preferred: PeerId): Promise<PeerId> => {
        try {
          await peerService.initialize(preferred);
          return preferred;
        } catch (error) {
          const errAny = error as { type?: string; message?: string };
          const message = typeof errAny?.message === "string" ? errAny.message : "";
          const isIdTaken = errAny?.type === "unavailable-id" || /\bis taken\b/i.test(message);

          // Canonical behavior: only fall back to a fresh peer id when reuse is rejected.
          // If signaling is down or initialization fails for other reasons, surface the error.
          if (!isIdTaken) throw error;

          console.warn("PeerId is unavailable; retrying with a new id", error);
          const fresh = `peer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` as PeerId;
          await peerService.initialize(fresh);
          return fresh;
        }
      };

      const waitForSnapshot = (timeoutMs: number, expectedPeerId: PeerId) =>
        new Promise<RoomSnapshot>((resolve, reject) => {
          const timeout = window.setTimeout(() => {
            unsubscribe?.();
            reject(new Error("Timed out waiting for host snapshot"));
          }, timeoutMs);

          const unsubscribe = peerService.onEvent((event) => {
            if (event.roomId !== incomingRoomId) return;
            if (event.type !== "room_snapshot") return;
            const payload = event.payload as RoomSnapshotPayload;
            if (!payload?.snapshot) return;

            // A takeover host may broadcast a canonical snapshot before this peer is admitted.
            // Only treat join as successful once we see ourselves in the snapshot metadata.
            const normalized = normalizeRoomSnapshot(payload.snapshot) ?? payload.snapshot;
            if (!snapshotIncludesSelf(normalized, expectedPeerId)) return;

            window.clearTimeout(timeout);
            unsubscribe();
            resolve(normalized);
          });
        });

      // Join can fail transiently if the signaling server briefly disconnects (notably during a join wave).
      // Retry connect + join_request + snapshot wait a few times before giving up.
      const MAX_ATTEMPTS = 3;
      const preferredRaw = options?.preferredPeerId ?? devicePeerIdRef.current;

      // Stability invariant: joiners must never initialize with peerId=roomId during normal join.
      let localPeerId: PeerId = (preferredRaw === incomingRoomId ? devicePeerIdRef.current : preferredRaw) as PeerId;
      let lastError: unknown = null;

      // Persist roomId early so the room route is stable even if join retries.
      storage.setItem("currentRoomId", incomingRoomId);
      setRoomId(incomingRoomId);

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        try {
          const current = peerService.getPeerId();

          // Avoid disconnect/re-initialize churn between join attempts.
          // Only initialize when there is no peer yet, or when we accidentally hold roomId (illegal for joiners).
          if (!current || current === incomingRoomId) {
            if (current === incomingRoomId) peerService.disconnect({ reason: "performJoin:illegal-roomId-held" });
            localPeerId = await initWithFallback(localPeerId);
          } else {
            localPeerId = current;
          }

          setActivePeerId(localPeerId);

          await peerService.connectToPeer(incomingRoomId, { timeoutMs: 20_000 });

          const snapshotPromise = waitForSnapshot(30_000, localPeerId);

          const sendJoinRequest = () => {
            peerService.sendTo(incomingRoomId, {
              type: "join_request",
              payload: {
                clientId: clientIdRef.current,
                displayName: displayName.trim() || "Player",
                asSpectator
              },
              senderId: localPeerId,
              roomId: incomingRoomId,
              timestamp: Date.now(),
              hostEpoch: metadataRef.current?.hostEpoch ?? 0
            });
          };

          // If the first join_request is dropped (common during host migration churn), keep
          // re-announcing until the host admits us (snapshot includes this participant).
          sendJoinRequest();
          const resendHandle = window.setInterval(sendJoinRequest, 2_000);

          let receivedSnapshot: RoomSnapshot;
          try {
            receivedSnapshot = await snapshotPromise;
          } finally {
            window.clearInterval(resendHandle);
          }
          lastHostSignalAtRef.current = Date.now();
          hasJoinedSuccessfullyRef.current = true;
          return receivedSnapshot;
        } catch (error) {
          lastError = error;
          console.warn(`Join attempt ${attempt}/${MAX_ATTEMPTS} failed; retrying...`, error);
          if (attempt >= MAX_ATTEMPTS) break;
          await sleep(500 * attempt);
        }
      }

      throw lastError instanceof Error ? lastError : new Error("Failed to join room after retries");
    },
    [displayName]
  );

  // If we restored a room where this runtime was the host, re-initialize PeerJS with the host id.
  useEffect(() => {
    if (!roomId || !metadata) return;
    if (metadata.hostId !== activePeerId) return;
    if (peerService.getPeerId()) return;

    void (async () => {
      try {
        peerService.disconnect({ reason: "restoreHostSession:init" });
        await peerService.initialize(activePeerId, { reason: "restoreHostSession:init" });
        setConnectionStatus("connected");
        setConnectedPeerIds(peerService.getPeerIds());
        lastSeenByClientIdRef.current.clear();
        setParticipantStatuses({ [clientIdRef.current]: "connected" });
      } catch (error) {
        const errAny = error as { type?: string; message?: string };
        const message = typeof errAny?.message === "string" ? errAny.message : "";
        const isIdTaken = errAny?.type === "unavailable-id" || /\bis taken\b/i.test(message);

        // If takeover already happened, the roomId peerId may be claimed by someone else.
        // Only then should the old host fall back to joining as a normal peer.
        if (!isIdTaken) {
          console.warn("Failed to restore host session; staying in host mode and waiting to reconnect", error);
          setConnectionStatus("offline");
          return;
        }

        console.warn("Failed to restore host session; falling back to join", error);
        try {
          const prefs = getRoomJoinPrefs();
          const roleFromMetadata = {
            wasSpectator: (metadata.spectators ?? []).some((s) => s.peerId === activePeerId),
            wasPlayer: metadata.players.some((p) => p.peerId === activePeerId)
          };

          // Prefer the restored metadata role (authoritative for this runtime) over persisted prefs.
          // Prefs can be stale if the user toggled role shortly before refresh.
          const asSpectator = roleFromMetadata.wasSpectator
            ? true
            : roleFromMetadata.wasPlayer
              ? false
              : Boolean(prefs[roomId]?.asSpectator);

          const receivedSnapshot = await performJoin(roomId, asSpectator, {
            preferredPeerId: devicePeerIdRef.current
          });
          const normalized = normalizeRoomSnapshot(receivedSnapshot);
          if (!normalized) return;
          applyNormalizedSnapshot(roomId, normalized);
        } catch (fallbackError) {
          console.warn("Fallback join after host-restore failure also failed", fallbackError);
        }
      }
    })();
  }, [activePeerId, applyNormalizedSnapshot, metadata, performJoin, roomId]);

  // Host migration is handled by host-liveness detection + periodic reconnect/claim attempts.

  useEffect(() => {
    if (!roomId || !metadata) return;
    const selfId = activePeerId;

    const isPlayer = metadata.players.some((p) => p.peerId === selfId);
    const isSpectator = (metadata.spectators ?? []).some((s) => s.peerId === selfId);
    if (!isPlayer && !isSpectator) return;

    setRoomJoinPref(roomId, isSpectator);
  }, [activePeerId, metadata, roomId]);

  useEffect(() => {
    if (!roomId) {
      setConnectionStatus("offline");
      return;
    }

    const update = () => {
      const peerId = peerService.getPeerId();
      if (!peerId) {
        setConnectionStatus("offline");
        setConnectedPeerIds([]);
        return;
      }

      // Host is considered connected when its PeerJS runtime is initialized.
      if (metadataRef.current?.hostId === peerId) {
        setConnectionStatus("connected");
        setConnectedPeerIds(peerService.getPeerIds());
        return;
      }

      // For non-host peers, determine status primarily from "have we heard from the host recently?"
      // This avoids staying "connected" due to slow/ghost PeerJS connection teardown.
      const now = Date.now();
      const lastHostSignalAt = lastHostSignalAtRef.current;
      const HOST_CONNECTED_MS = 5_000;
      const HOST_OFFLINE_MS = 20_000;

      if (!lastHostSignalAt) {
        setConnectionStatus("reconnecting");
        setConnectedPeerIds(peerService.getPeerIds());
        return;
      }

      const age = now - lastHostSignalAt;
      if (age <= HOST_CONNECTED_MS) setConnectionStatus("connected");
      else if (age <= HOST_OFFLINE_MS) setConnectionStatus("reconnecting");
      else setConnectionStatus("offline");

      setConnectedPeerIds(peerService.getPeerIds());
    };

    update();
    const interval = window.setInterval(update, 800);
    return () => window.clearInterval(interval);
  }, [roomId]);

  const computePresenceStatuses = useCallback((): Record<string, PresenceStatus> => {
    const currentMetadata = metadataRef.current;
    if (!currentMetadata) return {};

    return computePresenceStatusesFromHeartbeats({
      metadata: currentMetadata,
      lastSeenByClientId: lastSeenByClientIdRef.current
    });
  }, []);

  const claimRoomIdAsHost = useCallback(async (): Promise<boolean> => {
    const currentRoomId = roomIdRef.current;
    const currentMetadata = metadataRef.current;
    const currentSnapshot = snapshotRef.current;
    if (!currentRoomId || !currentMetadata || !currentSnapshot) return false;

    // If already host, nothing to claim.
    if (currentMetadata.hostId === activePeerId) return true;

    const previousPeerId = peerService.getPeerId();
    if (!previousPeerId) return false;

    const selfId = activePeerId;
    const wasSpectator = (currentMetadata.spectators ?? []).some((s) => s.peerId === selfId);
    const wasPlayer = currentMetadata.players.some((p) => p.peerId === selfId);
    const selfName =
      currentMetadata.players.find((p) => p.peerId === selfId)?.displayName ||
      (currentMetadata.spectators ?? []).find((s) => s.peerId === selfId)?.displayName ||
      displayName.trim() ||
      "Player";
    const selfClientId =
      currentMetadata.players.find((p) => p.peerId === selfId)?.clientId ||
      (currentMetadata.spectators ?? []).find((s) => s.peerId === selfId)?.clientId ||
      clientIdRef.current;

    const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

    const pickBestSnapshot = (snapshots: RoomSnapshot[]): RoomSnapshot => {
      return snapshots.reduce((best, s) => {
        if (s.version !== best.version) return s.version > best.version ? s : best;
        // Tie-breaker: keep the first (stable). lastEventId may be empty for early snapshots.
        return best;
      }, snapshots[0]);
    };

    const reconcileSnapshotForNewHost = (base: RoomSnapshot, opts: {
      roomId: string;
      nextHostEpoch: number;
      oldHostId: PeerId;
      selfOldPeerId: PeerId;
      selfClientId: string;
      selfName: string;
    }): RoomSnapshot => {
      const baseMetadata = base.metadata;

      const wasSpectator = (baseMetadata.spectators ?? []).some(
        (s) => s.clientId === opts.selfClientId || s.peerId === opts.selfOldPeerId
      );

      const remainingPlayers = baseMetadata.players.filter(
        (p) =>
          p.peerId !== opts.oldHostId &&
          p.peerId !== opts.selfOldPeerId &&
          p.peerId !== opts.roomId &&
          p.clientId !== opts.selfClientId
      );

      const remainingSpectators = (baseMetadata.spectators ?? []).filter(
        (s) => s.peerId !== opts.selfOldPeerId && s.peerId !== opts.roomId && s.clientId !== opts.selfClientId
      );

      const hostParticipant = {
        peerId: opts.roomId,
        clientId: opts.selfClientId,
        displayName: opts.selfName,
        joinedAt: Date.now()
      };

      const nextPlayers = (wasSpectator
        ? remainingPlayers
        : [hostParticipant, ...remainingPlayers].slice(0, baseMetadata.maxPlayers)
      ).slice(0, baseMetadata.maxPlayers);

      const nextSpectators = wasSpectator ? [...remainingSpectators, hostParticipant] : remainingSpectators;

      const updatedMetadata: RoomMetadata = {
        ...baseMetadata,
        roomId: opts.roomId,
        hostId: opts.roomId,
        hostClientId: opts.selfClientId,
        hostName: opts.selfName,
        hostEpoch: opts.nextHostEpoch,
        players: nextPlayers,
        spectators: nextSpectators
      };

      return {
        ...base,
        metadata: updatedMetadata,
        version: base.version + 1,
        // Keep lastEventId from the chosen base.
      };
    };

    try {
      peerService.disconnect({ reason: "takeover:claim-roomId" });
      await peerService.initialize(currentRoomId, { reason: "takeover:claim-roomId" });

      setActivePeerId(currentRoomId);

      const nextHostEpoch = (currentMetadata.hostEpoch ?? 0) + 1;
      const oldHostId = currentMetadata.hostId;

      // 1) Immediately publish a takeover snapshot based on our current local snapshot.
      //    This gets hostEpoch bumped and starts host liveness/presence.
      const localTakeoverBase = normalizeRoomSnapshot(currentSnapshot) ?? currentSnapshot;
      const initialCanonical = reconcileSnapshotForNewHost(localTakeoverBase, {
        roomId: currentRoomId,
        nextHostEpoch,
        oldHostId,
        selfOldPeerId: selfId,
        selfClientId,
        selfName
      });

      applyNormalizedSnapshot(currentRoomId, initialCanonical);

      // Keep local rejoin preference consistent with the preserved role.
      if (wasSpectator || wasPlayer) {
        setRoomJoinPref(currentRoomId, wasSpectator);
      }

      lastHostSignalAtRef.current = Date.now();
      lastSeenByClientIdRef.current.clear();
      setParticipantStatuses({ [selfClientId]: "connected" });

      // 2) Full state transfer: request snapshots from peers and choose the best by version.
      //    This is canonical in docs: race-to-claim + state transfer.
      const requestId = createId();
      stateTransferInboxRef.current.set(requestId, []);

      const candidatePeerIds = Array.from(
        new Set<PeerId>([
          ...currentMetadata.players.map((p) => p.peerId),
          ...(currentMetadata.spectators ?? []).map((s) => s.peerId)
        ])
      ).filter((pid) => pid !== oldHostId && pid !== selfId && pid !== currentRoomId);

      const connectWithTimeout = async (peerId: PeerId, timeoutMs: number) => {
        const timeout = new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error("connect timeout")), timeoutMs);
        });
        return Promise.race([peerService.connectToPeer(peerId), timeout]);
      };

      await Promise.allSettled(
        candidatePeerIds.map(async (pid) => {
          try {
            await connectWithTimeout(pid, 1_200);
          } catch {
            // If we can't connect, we can't request state from that peer.
          }

          peerService.sendTo(pid, {
            type: "request_state",
            payload: {
              requestId,
              targetHostEpoch: nextHostEpoch,
              knownVersion: initialCanonical.version
            } satisfies RequestStatePayload,
            senderId: currentRoomId,
            roomId: currentRoomId,
            timestamp: Date.now(),
            hostEpoch: nextHostEpoch
          });
        })
      );

      // Wait briefly for responses.
      await sleep(2_200);

      const received = stateTransferInboxRef.current.get(requestId) ?? [];
      stateTransferInboxRef.current.delete(requestId);

      const allCandidates = [initialCanonical, ...received]
        .map((s) => normalizeRoomSnapshot(s) ?? s)
        .filter((s) => s?.metadata?.roomId);

      if (allCandidates.length > 0) {
        const best = pickBestSnapshot(allCandidates);
        const finalCanonical = reconcileSnapshotForNewHost(best, {
          roomId: currentRoomId,
          nextHostEpoch,
          oldHostId,
          selfOldPeerId: selfId,
          selfClientId,
          selfName
        });

        applyNormalizedSnapshot(currentRoomId, finalCanonical);

        peerService.broadcast({
          type: "room_snapshot",
          payload: { snapshot: finalCanonical },
          senderId: currentRoomId,
          roomId: currentRoomId,
          timestamp: Date.now(),
          hostEpoch: nextHostEpoch
        });

        const statuses = computePresenceStatuses();
        setParticipantStatuses(statuses);
        peerService.broadcast({
          type: "presence_update",
          payload: { statuses } satisfies PresenceUpdatePayload,
          senderId: currentRoomId,
          roomId: currentRoomId,
          timestamp: Date.now(),
          hostEpoch: nextHostEpoch
        });
      }

      return true;
    } catch (error) {
      // If roomId is still taken (common right after host closes), re-initialize with our previous id.
      // If the previous id is also temporarily taken (server hasn't released yet), fall back to a fresh id.
      const isIdTakenError = (err: unknown) => {
        const errAny = err as { type?: string; message?: string };
        const message = typeof errAny?.message === "string" ? errAny.message : "";
        return errAny?.type === "unavailable-id" || /\bis taken\b/i.test(message);
      };

      try {
        peerService.disconnect({ reason: "takeover:failed-claim fallback" });
        try {
          await peerService.initialize(previousPeerId as PeerId, { reason: "takeover:fallback-prevPeerId" });
          setActivePeerId(previousPeerId as PeerId);
        } catch (reinitError) {
          if (!isIdTakenError(reinitError)) throw reinitError;

          console.warn("Previous peerId is temporarily unavailable after failed takeover; using a fresh id", {
            previousPeerId,
            error,
            reinitError
          });

          const fresh = `peer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` as PeerId;
          await peerService.initialize(fresh, { reason: "takeover:fallback-fresh" });
          setActivePeerId(fresh);
        }
      } catch {
        // If even that fails, we'll remain offline and let higher-level logic handle retry.
      }
      return false;
    }
  }, [activePeerId, applyNormalizedSnapshot, computePresenceStatuses, displayName]);

  useEffect(() => {
    if (!roomId || !metadata) return;
    if (metadata.hostId === activePeerId) return;

    // Once PeerJS is initialized, we can retry connection attempts.
    const peerId = peerService.getPeerId();
    if (!peerId) return;

    // If we are connected (recent host presence), just ensure phase resets.
    if (connectionStatus === "connected") return;

    let cancelled = false;
    let inFlight = false;

    const tick = async () => {
      if (cancelled || inFlight) return;

      const currentMetadata = metadataRef.current;
      const currentRoomId = roomIdRef.current;
      if (!currentMetadata || !currentRoomId) return;

      // If we somehow became host, stop.
      if (currentMetadata.hostId === activePeerId) return;

      const now = Date.now();
      const lastHostSignalAt = lastHostSignalAtRef.current;
      const joinedAt = roomEnteredAtRef.current;
      const hasJoinedSuccessfully = hasJoinedSuccessfullyRef.current;
      // Takeover is only allowed after we've successfully joined (received at least one snapshot/host signal).

      const JOIN_GRACE_MS = 6_000;
      const HOST_DOWN_SUSPECT_MS = 6_000;
      const HOST_DOWN_HARD_MS = 18_000;
      const TAKEOVER_COOLDOWN_MS = 3_000;

      const pastJoinGrace = now - joinedAt >= JOIN_GRACE_MS;
      const hostDownSuspected =
        hasJoinedSuccessfully &&
        pastJoinGrace &&
        lastHostSignalAt !== null &&
        now - lastHostSignalAt >= HOST_DOWN_SUSPECT_MS;
      const hostDownHard =
        hasJoinedSuccessfully &&
        pastJoinGrace &&
        lastHostSignalAt !== null &&
        now - lastHostSignalAt >= HOST_DOWN_HARD_MS;

      inFlight = true;
      try {
        const connectedToHost = peerService.getPeerIds().includes(currentMetadata.hostId);
        const anyConnections = peerService.getPeerIds().length > 0;

        // If we still have a live host presence signal, don't churn.
        // IMPORTANT: do NOT use connectedToHost as the primary liveness signal.
        // PeerJS connections can hang around even when the host is effectively gone.
        if (connectedToHost && !hostDownSuspected) return;

        if (!connectedToHost) {
          try {
            await peerService.connectToPeer(currentMetadata.hostId, { timeoutMs: 1_500 });
          } catch {
            // Ignore and retry later; takeover logic below may kick in.
          }
        }

        const prefs = getRoomJoinPrefs();
        const asSpectator = Boolean(prefs[currentRoomId]?.asSpectator);

        peerService.sendTo(currentMetadata.hostId, {
          type: "join_request",
          payload: {
            displayName: displayName.trim() || "Player",
            asSpectator,
            clientId: clientIdRef.current
          },
          senderId: peerService.getPeerId() ?? activePeerId,
          roomId: currentRoomId,
          timestamp: Date.now(),
          hostEpoch: currentMetadata.hostEpoch
        });

        // Reclaiming roomId requires PeerJS re-initialize, which drops existing connections.
        // To avoid thrash (notably when the old host rejoins as a normal peer), only reclaim when:
        // - host-down is suspected, and
        // - we currently have no live connections, OR host silence has reached a hard threshold.
        if (hostDownSuspected && (!anyConnections || hostDownHard)) {
          const lastAttemptAt = lastClaimAttemptAtRef.current;
          if (now - lastAttemptAt >= TAKEOVER_COOLDOWN_MS) {
            lastClaimAttemptAtRef.current = now;

            // Re-check right before reclaim to avoid disconnecting ourselves if a host signal just arrived.
            const refreshedLastHostSignalAt = lastHostSignalAtRef.current;
            if (refreshedLastHostSignalAt !== null && Date.now() - refreshedLastHostSignalAt < HOST_DOWN_SUSPECT_MS) {
              return;
            }

            const claimed = await claimRoomIdAsHost();
            if (claimed) return;
          }
        }
      } catch {
        // Ignore and retry later.
      } finally {
        inFlight = false;
      }
    };

    void tick();
    const interval = window.setInterval(tick, 3_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activePeerId, claimRoomIdAsHost, connectionStatus, displayName, metadata, roomId]);

  const appendMessage = useCallback((message: ChatMessage) => {
    if (seenMessageIdsRef.current.has(message.id)) return;
    seenMessageIdsRef.current.add(message.id);
    setMessages((prev) => [...prev, message]);
  }, []);

  useEffect(() => {
    if (!roomId || !metadata) return;

    const unsubscribeConn = peerService.onConnectionChange((peerId, status) => {
      const currentMetadata = metadataRef.current;
      const currentRoomId = roomIdRef.current;
      if (!currentMetadata || !currentRoomId) return;
      if (currentMetadata.hostId !== activePeerId) return;
      if (peerId === currentMetadata.hostId) return;

      const peerClientId =
        currentMetadata.players.find((p) => p.peerId === peerId)?.clientId ||
        (currentMetadata.spectators ?? []).find((s) => s.peerId === peerId)?.clientId ||
        peerId;

      if (status === "connected") {
        lastSeenByClientIdRef.current.set(peerClientId, Date.now());
      } else {
        // Force immediate "reconnecting" (age > CONNECTED_MS) while still allowing transition to offline later.
        lastSeenByClientIdRef.current.set(peerClientId, Date.now() - 6_000);
      }

      const statuses = computePresenceStatuses();
      setParticipantStatuses(statuses);

      const json = JSON.stringify(statuses);
      if (json !== lastPresenceBroadcastRef.current) {
        lastPresenceBroadcastRef.current = json;
        peerService.broadcast({
          type: "presence_update",
          payload: { statuses } satisfies PresenceUpdatePayload,
          senderId: peerService.getPeerId() ?? activePeerId,
          roomId: currentRoomId,
          timestamp: Date.now(),
          hostEpoch: currentMetadata.hostEpoch
        });
      }
    });

    if (metadata.hostId === activePeerId) {
      const tick = () => {
        const statuses = computePresenceStatuses();
        setParticipantStatuses(statuses);

        // Broadcast on a fixed cadence to act as a host liveness signal.
        // (This enables peers to suspect host-down based on absence of `presence_update`.)
        lastPresenceBroadcastRef.current = JSON.stringify(statuses);
        peerService.broadcast({
          type: "presence_update",
          payload: { statuses } satisfies PresenceUpdatePayload,
          senderId: peerService.getPeerId() ?? activePeerId,
          roomId,
          timestamp: Date.now(),
          hostEpoch: metadata.hostEpoch
        });
      };

      tick();
      const interval = window.setInterval(tick, 2_000);
      return () => {
        window.clearInterval(interval);
        unsubscribeConn?.();
      };
    }

    const interval = window.setInterval(() => {
      peerService.sendTo(metadata.hostId, {
        type: "heartbeat",
        payload: { clientId: clientIdRef.current } satisfies HeartbeatPayload,
        senderId: peerService.getPeerId() ?? activePeerId,
        roomId,
        timestamp: Date.now(),
        hostEpoch: metadata.hostEpoch
      });
    }, 2_000);

    return () => {
      window.clearInterval(interval);
      unsubscribeConn?.();
    };
  }, [activePeerId, computePresenceStatuses, metadata, roomId]);

  const broadcastSystemMessage = useCallback(
    (kind: SystemMessageKind, actorName: string, currentRoomId: string) => {
      const message: ChatMessage = {
        id: createId(),
        timestamp: Date.now(),
        type: "system",
        kind,
        actorName
      };

      appendMessage(message);
      const hostEpoch = metadataRef.current?.hostEpoch ?? 0;
      peerService.broadcast({
        type: "chat_event",
        payload: { message } satisfies ChatEventPayload,
        senderId: peerService.getPeerId() ?? activePeerId,
        roomId: currentRoomId,
        timestamp: Date.now(),
        hostEpoch
      });
    },
    [activePeerId, appendMessage]
  );

  useEffect(() => {
    const unsubscribe = peerService.onEvent((event) => {
      const currentRoomId = roomIdRef.current;
      const currentMetadata = metadataRef.current;
      const currentSnapshot = snapshotRef.current;

      if (!currentRoomId) return;
      if (event.roomId !== currentRoomId) return;

      if (event.type === "room_snapshot") {
        if (currentMetadata && event.hostEpoch < (currentMetadata.hostEpoch ?? 0)) return;
        const payload = event.payload as RoomSnapshotPayload;
        if (!payload?.snapshot) return;
        const normalized = normalizeRoomSnapshot(payload.snapshot);
        if (!normalized) return;
        if (event.senderId === normalized.metadata.hostId) {
          lastHostSignalAtRef.current = Date.now();
        }
        const selfPeerId = peerService.getPeerId() ?? activePeerId;
        const players = normalized.metadata.players ?? [];
        const spectators = normalized.metadata.spectators ?? [];
        const inMetadata = [...players, ...spectators].some(
          (p) => p.clientId === clientIdRef.current || p.peerId === selfPeerId || p.peerId === activePeerId
        );
        if (inMetadata) hasJoinedSuccessfullyRef.current = true;
        applyNormalizedSnapshot(currentRoomId, normalized);
        return;
      }

      if (event.type === "heartbeat") {
        const currentMetadata = metadataRef.current;
        if (!currentMetadata) return;
        if (currentMetadata.hostId !== activePeerId) return;
        const payload = event.payload as HeartbeatPayload;
        const senderPeerId = event.senderId;
        const senderClientId =
          (typeof payload?.clientId === "string" && payload.clientId.trim().length > 0
            ? payload.clientId.trim()
            : currentMetadata.players.find((p) => p.peerId === senderPeerId)?.clientId ||
              (currentMetadata.spectators ?? []).find((s) => s.peerId === senderPeerId)?.clientId ||
              senderPeerId);
        lastSeenByClientIdRef.current.set(senderClientId, Date.now());
        return;
      }

      if (event.type === "presence_update") {
        if (currentMetadata && event.hostEpoch < (currentMetadata.hostEpoch ?? 0)) return;
        // Presence updates are used as the primary host liveness signal.
        if (event.senderId === currentRoomId) {
          lastHostSignalAtRef.current = Date.now();

          // If a new host epoch is observed from the roomId endpoint, persist it immediately.
          if (currentMetadata && event.hostEpoch > (currentMetadata.hostEpoch ?? 0)) {
            const bumped: RoomMetadata = { ...currentMetadata, hostEpoch: event.hostEpoch };
            storage.setItem("roomMetadata", bumped);
            setMetadata(bumped);
          }
        }
        const payload = event.payload as PresenceUpdatePayload;
        if (!payload?.statuses) return;
        setParticipantStatuses(payload.statuses);
        return;
      }

      if (event.type === "request_state") {
        const payload = event.payload as RequestStatePayload;
        const requestId = typeof payload?.requestId === "string" ? payload.requestId : "";
        const targetHostEpoch = typeof payload?.targetHostEpoch === "number" ? payload.targetHostEpoch : null;
        if (!requestId || targetHostEpoch === null) return;

        // Any peer can respond with its latest known snapshot.
        const snapshotToSend = snapshotRef.current;
        if (!snapshotToSend) return;

        peerService.sendTo(event.senderId, {
          type: "provide_state",
          payload: {
            requestId,
            targetHostEpoch,
            snapshot: snapshotToSend
          } satisfies ProvideStatePayload,
          senderId: peerService.getPeerId() ?? activePeerId,
          roomId: currentRoomId,
          timestamp: Date.now(),
          hostEpoch: metadataRef.current?.hostEpoch ?? 0
        });
        return;
      }

      if (event.type === "provide_state") {
        if (!currentMetadata) return;
        if (currentMetadata.hostId !== activePeerId) return;

        const payload = event.payload as ProvideStatePayload;
        const requestId = typeof payload?.requestId === "string" ? payload.requestId : "";
        const targetHostEpoch = typeof payload?.targetHostEpoch === "number" ? payload.targetHostEpoch : null;
        const provided = payload?.snapshot ?? null;
        if (!requestId || targetHostEpoch === null || !provided) return;

        // Only accept states for the current host epoch takeover.
        if (targetHostEpoch !== (currentMetadata.hostEpoch ?? 0)) return;

        const normalized = normalizeRoomSnapshot(provided);
        if (!normalized) return;

        const inbox = stateTransferInboxRef.current.get(requestId);
        if (!inbox) return;
        inbox.push(normalized);
        return;
      }

      if (event.type === "chat_event") {
        if (currentMetadata && event.hostEpoch < (currentMetadata.hostEpoch ?? 0)) return;
        const payload = event.payload as ChatEventPayload;
        if (!payload?.message) return;
        appendMessage(payload.message);

        if (currentMetadata?.hostId === activePeerId) {
          peerService.broadcast({
            type: "chat_event",
            payload,
            senderId: peerService.getPeerId() ?? activePeerId,
            roomId: currentRoomId,
            timestamp: Date.now(),
            hostEpoch: currentMetadata.hostEpoch
          });
        }
        return;
      }

      if (event.type === "join_request") {
        if (!currentMetadata || !currentSnapshot) return;
        if (currentMetadata.hostId !== activePeerId) return;

        const payload = event.payload as JoinRequestPayload;
        const joinerId = event.senderId;
        const stableClientId =
          typeof payload?.clientId === "string" && payload.clientId.trim().length > 0
            ? payload.clientId.trim()
            : null;
        const joinerClientId = stableClientId ?? joinerId;
        const joinerName = (payload?.displayName || "Player").trim() || "Player";
        const requestedAsSpectator = Boolean(payload?.asSpectator);

        const nameKey = joinerName.trim().toLowerCase();
        const alreadyPlayer = currentMetadata.players.some(
          (p) => p.peerId === joinerId || (stableClientId ? p.clientId === joinerClientId : false)
        );
        const alreadySpectator = (currentMetadata.spectators ?? []).some(
          (s) => s.peerId === joinerId || (stableClientId ? s.clientId === joinerClientId : false)
        );
        const alreadyInRequestedRole = requestedAsSpectator ? alreadySpectator : alreadyPlayer;
        const existingSeatName = alreadyPlayer
          ? currentMetadata.players.find((p) => p.peerId === joinerId || p.clientId === joinerClientId)?.displayName
          : (currentMetadata.spectators ?? []).find((s) => s.peerId === joinerId || s.clientId === joinerClientId)?.displayName;

        // Idempotence: joiners may resend join_request during churn/reconnect.
        // If they are already listed in the requested role and name matches, just ACK with the current snapshot.
        if (alreadyInRequestedRole && (existingSeatName ?? "").trim().toLowerCase() === nameKey) {
          lastSeenByClientIdRef.current.set(joinerClientId, Date.now());
          peerService.sendTo(joinerId, {
            type: "room_snapshot",
            payload: { snapshot: currentSnapshot },
            senderId: peerService.getPeerId() ?? activePeerId,
            roomId: currentRoomId,
            timestamp: Date.now(),
            hostEpoch: currentMetadata.hostEpoch
          });
          peerService.sendTo(joinerId, {
            type: "presence_update",
            payload: { statuses: computePresenceStatuses() } satisfies PresenceUpdatePayload,
            senderId: peerService.getPeerId() ?? activePeerId,
            roomId: currentRoomId,
            timestamp: Date.now(),
            hostEpoch: currentMetadata.hostEpoch
          });
          return;
        }

        lastSeenByClientIdRef.current.set(joinerClientId, Date.now());

        const presenceStatuses = computePresenceStatuses();
        const connectedNow = new Set(peerService.getPeerIds());

        const canReplacePeerId = (peerId: PeerId) => {
          const clientIdForPeer =
            currentMetadata.players.find((p) => p.peerId === peerId)?.clientId ||
            (currentMetadata.spectators ?? []).find((s) => s.peerId === peerId)?.clientId ||
            peerId;
          const status = presenceStatuses[clientIdForPeer] ?? "reconnecting";
          return peerId !== joinerId && status !== "connected" && !connectedNow.has(peerId);
        };

        const existingPlayerByName = currentMetadata.players.find(
          (p) => p.peerId !== joinerId && p.displayName.trim().toLowerCase() === nameKey
        );

        const existingSpectatorByName = (currentMetadata.spectators ?? []).find(
          (s) => s.peerId !== joinerId && s.displayName.trim().toLowerCase() === nameKey
        );

        // "Last tab wins": if the joiner provides a stable clientId, remove any existing seats
        // with the same clientId (across players/spectators) and re-add them with the requested role.
        // For legacy clients (no clientId), fall back to the older displayName-based heuristic.
        const priorPlayers = currentMetadata.players.filter((p) => p.peerId !== joinerId);
        const priorSpectators = (currentMetadata.spectators ?? []).filter((s) => s.peerId !== joinerId);

        const replacedPeerIdsByClientId = stableClientId
          ? [
              ...priorPlayers.filter((p) => p.clientId === joinerClientId).map((p) => p.peerId),
              ...priorSpectators.filter((s) => s.clientId === joinerClientId).map((s) => s.peerId)
            ]
          : [];

        const existingPlayers = stableClientId
          ? priorPlayers.filter((p) => p.clientId !== joinerClientId)
          : priorPlayers;

        const existingSpectators = stableClientId
          ? priorSpectators.filter((s) => s.clientId !== joinerClientId)
          : priorSpectators;

        const replacePlayerPeerId = (oldPeerId: PeerId) =>
          existingPlayers.map((p) =>
            p.peerId === oldPeerId
              ? {
                  ...p,
                  peerId: joinerId,
                  clientId: joinerClientId,
                  displayName: joinerName,
                  joinedAt: Date.now()
                }
              : p
          );

        const replaceSpectatorPeerId = (oldPeerId: PeerId) =>
          existingSpectators.map((s) =>
            s.peerId === oldPeerId
              ? {
                  ...s,
                  peerId: joinerId,
                  clientId: joinerClientId,
                  displayName: joinerName,
                  joinedAt: Date.now()
                }
              : s
          );

        let replacedPeerId: PeerId | null = null;
        let nextPlayers = existingPlayers;
        let nextSpectators = existingSpectators;

        const joinerEntry = {
          peerId: joinerId,
          clientId: joinerClientId,
          displayName: joinerName,
          joinedAt: Date.now()
        };

        if (stableClientId) {
          // Stable identity path: enforce last-tab-wins by clientId.
          // Migration guard: if the room snapshot was persisted before clientId existed, seats may have
          // clientId defaulted to peerId. In that case, a stable clientId rejoin would otherwise create
          // a duplicate "ghost" participant (old peerId stays in metadata => shows as reconnecting).
          // We allow a conservative name-based migration only when:
          // - no seat currently matches this clientId, and
          // - the name match looks legacy (clientId === peerId), and
          // - that seat is not connected.
          const hasSeatByClientId = replacedPeerIdsByClientId.length > 0;
          const preferredLegacySeat = requestedAsSpectator
            ? (existingSpectatorByName ?? existingPlayerByName)
            : (existingPlayerByName ?? existingSpectatorByName);
          const canMigrateLegacySeat =
            !hasSeatByClientId &&
            Boolean(preferredLegacySeat) &&
            preferredLegacySeat!.clientId === preferredLegacySeat!.peerId &&
            canReplacePeerId(preferredLegacySeat!.peerId);

          if (canMigrateLegacySeat) {
            const oldPeerId = preferredLegacySeat!.peerId;
            replacedPeerId = oldPeerId;
            const playersWithoutOld = existingPlayers.filter((p) => p.peerId !== oldPeerId);
            const spectatorsWithoutOld = existingSpectators.filter((s) => s.peerId !== oldPeerId);

            nextPlayers = requestedAsSpectator
              ? playersWithoutOld
              : [...playersWithoutOld, joinerEntry].slice(0, currentMetadata.maxPlayers);
            nextSpectators = requestedAsSpectator ? [...spectatorsWithoutOld, joinerEntry] : spectatorsWithoutOld;
          } else {
            nextPlayers = requestedAsSpectator
              ? existingPlayers
              : [...existingPlayers, joinerEntry].slice(0, currentMetadata.maxPlayers);
            nextSpectators = requestedAsSpectator ? [...existingSpectators, joinerEntry] : existingSpectators;
          }
        } else if (requestedAsSpectator) {
          // Legacy path: Target role: spectator. Honor the joiner's request even if a stale player seat exists by name.
          if (existingSpectatorByName && canReplacePeerId(existingSpectatorByName.peerId)) {
            replacedPeerId = existingSpectatorByName.peerId;
            nextSpectators = replaceSpectatorPeerId(existingSpectatorByName.peerId);
          } else {
            if (existingPlayerByName && canReplacePeerId(existingPlayerByName.peerId)) {
              replacedPeerId = existingPlayerByName.peerId;
              nextPlayers = existingPlayers.filter((p) => p.peerId !== existingPlayerByName.peerId);
            }
            nextSpectators = [...existingSpectators, joinerEntry];
          }
        } else {
          // Legacy path: Target role: player.
          if (existingPlayerByName && canReplacePeerId(existingPlayerByName.peerId)) {
            replacedPeerId = existingPlayerByName.peerId;
            nextPlayers = replacePlayerPeerId(existingPlayerByName.peerId);
          } else {
            if (existingSpectatorByName && canReplacePeerId(existingSpectatorByName.peerId)) {
              replacedPeerId = existingSpectatorByName.peerId;
              nextSpectators = existingSpectators.filter((s) => s.peerId !== existingSpectatorByName.peerId);
            }
            nextPlayers = [...existingPlayers, joinerEntry].slice(0, currentMetadata.maxPlayers);
          }
        }

        // Never leave the joiner unlisted.
        // If they requested player but the room is full (and they weren't inserted due to slicing),
        // place them into spectators as a safe fallback.
        if (!requestedAsSpectator && !nextPlayers.some((p) => p.peerId === joinerId)) {
          nextSpectators = [...nextSpectators, joinerEntry];
        }

        // Presence is tracked by clientId; no cleanup needed here.

        const updatedMetadata: RoomMetadata = {
          ...currentMetadata,
          players: nextPlayers,
          spectators: nextSpectators
        };

        const updatedSnapshot: RoomSnapshot = {
          ...currentSnapshot,
          metadata: updatedMetadata,
          version: currentSnapshot.version + 1
        };

        storage.setItem("roomMetadata", updatedMetadata);
        storage.setItem("roomSnapshot", updatedSnapshot);
        setMetadata(updatedMetadata);
        setSnapshot(updatedSnapshot);

        peerService.sendTo(joinerId, {
          type: "room_snapshot",
          payload: { snapshot: updatedSnapshot },
          senderId: peerService.getPeerId() ?? activePeerId,
          roomId: currentRoomId,
          timestamp: Date.now(),
          hostEpoch: updatedMetadata.hostEpoch
        });

        peerService.broadcast({
          type: "room_snapshot",
          payload: { snapshot: updatedSnapshot },
          senderId: peerService.getPeerId() ?? activePeerId,
          roomId: currentRoomId,
          timestamp: Date.now(),
          hostEpoch: updatedMetadata.hostEpoch
        });

        if (!replacedPeerId) {
          broadcastSystemMessage("joined", joinerName, currentRoomId);
        }

        const statuses = computePresenceStatuses();
        setParticipantStatuses(statuses);
        peerService.broadcast({
          type: "presence_update",
          payload: { statuses } satisfies PresenceUpdatePayload,
          senderId: peerService.getPeerId() ?? activePeerId,
          roomId: currentRoomId,
          timestamp: Date.now(),
          hostEpoch: updatedMetadata.hostEpoch
        });

        return;
      }

      if (event.type === "leave_notice") {
        if (!currentMetadata || !currentSnapshot) return;
        if (currentMetadata.hostId !== activePeerId) return;

        const payload = event.payload as LeaveNoticePayload;
        const leaverId = event.senderId;
        const leaverName = (payload?.displayName || "Player").trim() || "Player";

        const leaverClientId =
          currentMetadata.players.find((p) => p.peerId === leaverId)?.clientId ||
          (currentMetadata.spectators ?? []).find((s) => s.peerId === leaverId)?.clientId ||
          leaverId;
        lastSeenByClientIdRef.current.delete(leaverClientId);

        const nextPlayers = currentMetadata.players.filter((p) => p.peerId !== leaverId);
        const nextSpectators = (currentMetadata.spectators ?? []).filter((s) => s.peerId !== leaverId);

        const updatedMetadata: RoomMetadata = {
          ...currentMetadata,
          players: nextPlayers,
          spectators: nextSpectators
        };

        const updatedSnapshot: RoomSnapshot = {
          ...currentSnapshot,
          metadata: updatedMetadata,
          version: currentSnapshot.version + 1
        };

        storage.setItem("roomMetadata", updatedMetadata);
        storage.setItem("roomSnapshot", updatedSnapshot);
        setMetadata(updatedMetadata);
        setSnapshot(updatedSnapshot);

        peerService.broadcast({
          type: "room_snapshot",
          payload: { snapshot: updatedSnapshot },
          senderId: peerService.getPeerId() ?? activePeerId,
          roomId: currentRoomId,
          timestamp: Date.now(),
          hostEpoch: updatedMetadata.hostEpoch
        });

        broadcastSystemMessage("left", leaverName, currentRoomId);

        const statuses = computePresenceStatuses();
        setParticipantStatuses(statuses);
        peerService.broadcast({
          type: "presence_update",
          payload: { statuses } satisfies PresenceUpdatePayload,
          senderId: peerService.getPeerId() ?? activePeerId,
          roomId: currentRoomId,
          timestamp: Date.now(),
          hostEpoch: updatedMetadata.hostEpoch
        });
        return;
      }

      if (event.type === "role_change_request") {
        if (!currentMetadata || !currentSnapshot) return;
        if (currentMetadata.hostId !== activePeerId) return;

        const payload = event.payload as RoleChangeRequestPayload;
        const requesterId = event.senderId;
        const asSpectator = Boolean(payload?.asSpectator);

        const requesterName =
          currentMetadata.players.find((p) => p.peerId === requesterId)?.displayName ||
          currentMetadata.spectators.find((s) => s.peerId === requesterId)?.displayName ||
          "Player";

        const requesterClientId =
          currentMetadata.players.find((p) => p.peerId === requesterId)?.clientId ||
          currentMetadata.spectators.find((s) => s.peerId === requesterId)?.clientId ||
          requesterId;

        const playersWithoutRequester = currentMetadata.players.filter((p) => p.peerId !== requesterId);
        const spectatorsWithoutRequester = (currentMetadata.spectators ?? []).filter((s) => s.peerId !== requesterId);

        const nextPlayers = asSpectator
          ? playersWithoutRequester
          : [
              ...playersWithoutRequester,
              {
                peerId: requesterId,
                clientId: requesterClientId,
                displayName: requesterName,
                joinedAt: Date.now()
              }
            ].slice(0, currentMetadata.maxPlayers);

        const nextSpectators = asSpectator
          ? [
              ...spectatorsWithoutRequester,
              {
                peerId: requesterId,
                clientId: requesterClientId,
                displayName: requesterName,
                joinedAt: Date.now()
              }
            ]
          : spectatorsWithoutRequester;

        const updatedMetadata: RoomMetadata = {
          ...currentMetadata,
          players: nextPlayers,
          spectators: nextSpectators
        };

        const updatedSnapshot: RoomSnapshot = {
          ...currentSnapshot,
          metadata: updatedMetadata,
          version: currentSnapshot.version + 1
        };

        storage.setItem("roomMetadata", updatedMetadata);
        storage.setItem("roomSnapshot", updatedSnapshot);
        setMetadata(updatedMetadata);
        setSnapshot(updatedSnapshot);

        peerService.broadcast({
          type: "room_snapshot",
          payload: { snapshot: updatedSnapshot },
          senderId: peerService.getPeerId() ?? activePeerId,
          roomId: currentRoomId,
          timestamp: Date.now(),
          hostEpoch: updatedMetadata.hostEpoch
        });

        broadcastSystemMessage(asSpectator ? "became_spectator" : "became_player", requesterName, currentRoomId);

        const statuses = computePresenceStatuses();
        setParticipantStatuses(statuses);
        peerService.broadcast({
          type: "presence_update",
          payload: { statuses } satisfies PresenceUpdatePayload,
          senderId: peerService.getPeerId() ?? activePeerId,
          roomId: currentRoomId,
          timestamp: Date.now(),
          hostEpoch: updatedMetadata.hostEpoch
        });
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [activePeerId, appendMessage, applyNormalizedSnapshot, broadcastSystemMessage, computePresenceStatuses]);

  useEffect(() => {
    let mounted = true;
    void persistence.getDisplayName().then((name) => {
      if (!mounted) return;
      storage.setItem("displayName", name);
      setDisplayName(name);
      setDisplayNameReady((name ?? "").trim().length > 0);
    });

    const unsubscribe = persistence.subscribe((message) => {
      if (!mounted) return;
      if (
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        (message as { type: string }).type === "pref_updated" &&
        "key" in message &&
        (message as { key: string }).key === "displayName"
      ) {
        void persistence.getDisplayName().then((name) => {
          storage.setItem("displayName", name);
          setDisplayName(name);
          setDisplayNameReady((name ?? "").trim().length > 0);
        });
      }
    });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [activePeerId, displayName]);

  const createRoom = useCallback(
    async (gameId: string, maxPlayers: number): Promise<string> => {
      const newRoomId = generateRoomId();
      const creatorName = displayName.trim() || "Player";

      if (isE2EPeerDisabled()) {
        const newMetadata = initializeRoomMetadata(
          newRoomId,
          gameId,
          newRoomId,
          creatorName,
          maxPlayers,
          clientIdRef.current
        );

        const newSnapshot: RoomSnapshot = {
          metadata: newMetadata,
          gameState: { phase: "setup" },
          version: 1,
          lastEventId: ""
        };

        storage.setItem("currentRoomId", newRoomId);
        storage.setItem("roomMetadata", newMetadata);
        storage.setItem("roomSnapshot", newSnapshot);

        setActivePeerId(newRoomId);
        setRoomId(newRoomId);
        setMetadata(newMetadata);
        setSnapshot(newSnapshot);
        setConnectionStatus("connected");

        seenMessageIdsRef.current.clear();
        setMessages([]);
        lastSeenByClientIdRef.current.clear();
        setParticipantStatuses({ [clientIdRef.current]: "connected" });

        setRoomJoinPref(newRoomId, false);
        return newRoomId;
      }

      peerService.disconnect({ reason: "createRoom" });
      await peerService.initialize(newRoomId, { reason: "createRoom" });
      setActivePeerId(newRoomId);

      const newMetadata = initializeRoomMetadata(
        newRoomId,
        gameId,
        newRoomId,
        creatorName,
        maxPlayers,
        clientIdRef.current
      );

      const newSnapshot: RoomSnapshot = {
        metadata: newMetadata,
        gameState: { phase: "setup" },
        version: 1,
        lastEventId: ""
      };

      storage.setItem("currentRoomId", newRoomId);
      storage.setItem("roomMetadata", newMetadata);
      storage.setItem("roomSnapshot", newSnapshot);

      setRoomId(newRoomId);
      setMetadata(newMetadata);
      setSnapshot(newSnapshot);

      seenMessageIdsRef.current.clear();
      setMessages([]);
      lastSeenByClientIdRef.current.clear();
      setParticipantStatuses({ [clientIdRef.current]: "connected" });

      setRoomJoinPref(newRoomId, false);

      return newRoomId;
    },
    [displayName]
  );

  const joinRoom = useCallback(
    async (incomingRoomId: string, options?: { asSpectator?: boolean }): Promise<void> => {
      const asSpectator = Boolean(options?.asSpectator);

      if (isE2EPeerDisabled()) {
        const selfPeerId = activePeerId;
        const selfName = displayName.trim() || "Player";

        const host = {
          clientId: "host_client",
          peerId: incomingRoomId,
          displayName: "Host",
          joinedAt: Date.now() - 1000
        };

        const self = {
          clientId: clientIdRef.current,
          peerId: selfPeerId,
          displayName: selfName,
          joinedAt: Date.now()
        };

        const metadata: RoomMetadata = {
          roomId: incomingRoomId,
          gameId: "catan",
          hostId: incomingRoomId,
          hostClientId: host.clientId,
          hostName: host.displayName,
          hostEpoch: 0,
          players: asSpectator ? [host] : [host, self],
          spectators: asSpectator ? [self] : [],
          createdAt: Date.now() - 1000,
          maxPlayers: 4
        };

        const snapshot: RoomSnapshot = {
          metadata,
          gameState: { phase: "setup" },
          version: 1,
          lastEventId: ""
        };

        storage.setItem("currentRoomId", incomingRoomId);
        storage.setItem("roomMetadata", metadata);
        storage.setItem("roomSnapshot", snapshot);

        setRoomId(incomingRoomId);
        setMetadata(metadata);
        setSnapshot(snapshot);
        setConnectionStatus("connected");

        setRoomJoinPref(incomingRoomId, asSpectator);

        seenMessageIdsRef.current.clear();
        setMessages([]);
        lastSeenByClientIdRef.current.clear();
        setParticipantStatuses({
          [host.clientId]: "connected",
          [clientIdRef.current]: "connected"
        });
        return;
      }

      const receivedSnapshot = await performJoin(incomingRoomId, asSpectator);
      const normalized = normalizeRoomSnapshot(receivedSnapshot);
      if (!normalized) return;
      applyNormalizedSnapshot(incomingRoomId, normalized);

      setRoomJoinPref(incomingRoomId, asSpectator);

      seenMessageIdsRef.current.clear();
      setMessages([]);
      lastSeenByClientIdRef.current.clear();
      setParticipantStatuses({});
    },
    [activePeerId, applyNormalizedSnapshot, displayName, performJoin]
  );

  const leaveRoom = useCallback(() => {
    const currentRoomId = roomIdRef.current;
    const currentMetadata = metadataRef.current;
    const selfId = activePeerId;
    const isCurrentlyHost = currentMetadata?.hostId === selfId;

    if (currentRoomId && currentMetadata && !isCurrentlyHost) {
      peerService.sendTo(currentMetadata.hostId, {
        type: "leave_notice",
        payload: { displayName: displayName.trim() || "Player" } satisfies LeaveNoticePayload,
        senderId: peerService.getPeerId() ?? selfId,
        roomId: currentRoomId,
        timestamp: Date.now(),
        hostEpoch: currentMetadata.hostEpoch
      });
    }

    peerService.disconnect({ reason: "leaveRoom" });
    storage.removeItem("currentRoomId");
    storage.removeItem("roomMetadata");
    storage.removeItem("roomSnapshot");
    setRoomId(null);
    setMetadata(null);
    setSnapshot(null);
    setActivePeerId(devicePeerIdRef.current);
    setConnectionStatus("offline");
    setConnectedPeerIds([]);
    seenMessageIdsRef.current.clear();
    setMessages([]);
    lastSeenByClientIdRef.current.clear();
    setParticipantStatuses({});
  }, [activePeerId, displayName]);

  const updateLocalName = useCallback((name: string) => {
    const result = normalizeDisplayName(name);
    if (!result.ok) return;
    storage.setItem("displayName", result.value);
    setDisplayName(result.value);
    void persistence.setDisplayName(result.value);
  }, []);

  const requestRoleChange = useCallback(
    (asSpectator: boolean) => {
      const currentRoomId = roomIdRef.current;
      const currentMetadata = metadataRef.current;
      const currentSnapshot = snapshotRef.current;
      if (!currentRoomId || !currentMetadata || !currentSnapshot) return;

      const selfId = activePeerId;
      const selfName =
        currentMetadata.players.find((p) => p.peerId === selfId)?.displayName ||
        currentMetadata.spectators.find((s) => s.peerId === selfId)?.displayName ||
        displayName.trim() ||
        "Player";

      const selfClientId =
        currentMetadata.players.find((p) => p.peerId === selfId)?.clientId ||
        currentMetadata.spectators.find((s) => s.peerId === selfId)?.clientId ||
        clientIdRef.current;

      if (currentMetadata.hostId === selfId) {
        const nextPlayers = asSpectator
          ? currentMetadata.players.filter((p) => p.peerId !== selfId)
          : [
              ...currentMetadata.players.filter((p) => p.peerId !== selfId),
              { peerId: selfId, clientId: selfClientId, displayName: selfName, joinedAt: Date.now() }
            ].slice(0, currentMetadata.maxPlayers);

        const nextSpectators = asSpectator
          ? [
              ...(currentMetadata.spectators ?? []).filter((s) => s.peerId !== selfId),
              { peerId: selfId, clientId: selfClientId, displayName: selfName, joinedAt: Date.now() }
            ]
          : (currentMetadata.spectators ?? []).filter((s) => s.peerId !== selfId);

        const updatedMetadata: RoomMetadata = {
          ...currentMetadata,
          players: nextPlayers,
          spectators: nextSpectators
        };

        const updatedSnapshot: RoomSnapshot = {
          ...currentSnapshot,
          metadata: updatedMetadata,
          version: currentSnapshot.version + 1
        };

        storage.setItem("roomMetadata", updatedMetadata);
        storage.setItem("roomSnapshot", updatedSnapshot);
        setMetadata(updatedMetadata);
        setSnapshot(updatedSnapshot);

        peerService.broadcast({
          type: "room_snapshot",
          payload: { snapshot: updatedSnapshot },
          senderId: selfId,
          roomId: currentRoomId,
          timestamp: Date.now(),
          hostEpoch: updatedMetadata.hostEpoch
        });

        broadcastSystemMessage(asSpectator ? "became_spectator" : "became_player", selfName, currentRoomId);
        return;
      }

      peerService.sendTo(currentMetadata.hostId, {
        type: "role_change_request",
        payload: { asSpectator },
        senderId: selfId,
        roomId: currentRoomId,
        timestamp: Date.now(),
        hostEpoch: currentMetadata.hostEpoch
      });
    },
    [activePeerId, broadcastSystemMessage, displayName]
  );

  const sendChatMessage = useCallback(
    (text: string) => {
      const currentRoomId = roomIdRef.current;
      const currentMetadata = metadataRef.current;
      if (!currentRoomId || !currentMetadata) return;

      const trimmed = text.trim();
      if (!trimmed) return;

      const selfId = activePeerId;
      const isSpectator = currentMetadata.spectators.some((s) => s.peerId === selfId);

      const senderName =
        currentMetadata.players.find((p) => p.peerId === selfId)?.displayName ||
        currentMetadata.spectators.find((s) => s.peerId === selfId)?.displayName ||
        displayName.trim() ||
        "Player";

      const message: ChatMessage = {
        id: createId(),
        timestamp: Date.now(),
        type: "user",
        senderId: selfId,
        senderName,
        isSpectator,
        text: trimmed
      };

      appendMessage(message);

      if (currentMetadata.hostId === selfId) {
        peerService.broadcast({
          type: "chat_event",
          payload: { message } satisfies ChatEventPayload,
          senderId: selfId,
          roomId: currentRoomId,
          timestamp: Date.now(),
          hostEpoch: currentMetadata.hostEpoch
        });
        return;
      }

      peerService.sendTo(currentMetadata.hostId, {
        type: "chat_event",
        payload: { message } satisfies ChatEventPayload,
        senderId: selfId,
        roomId: currentRoomId,
        timestamp: Date.now(),
        hostEpoch: currentMetadata.hostEpoch
      });
    },
    [activePeerId, appendMessage, displayName]
  );

  return {
    roomId,
    metadata,
    snapshot,
    ui,
    localPeerId: activePeerId,
    localClientId: clientIdRef.current,
    displayName,
    displayNameReady,
    isHost,
    connectionStatus,
    connectedPeerIds,
    participantStatuses,
    messages,
    createRoom,
    joinRoom,
    leaveRoom,
    updateLocalName,
    requestRoleChange,
    sendChatMessage
  };
};
