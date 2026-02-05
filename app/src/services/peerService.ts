import Peer from "peerjs";
import type { DataConnection } from "peerjs";
import type { PeerId, PeerEvent } from "../utils/types";

type PeerJsEnvConfig = {
  host?: string;
  port?: number;
  path?: string;
  secure?: boolean;
  key?: string;
};

const getPeerJsEnvConfig = (): PeerJsEnvConfig => {
  // Vite injects env vars into import.meta.env at build time.
  // All fields are optional; defaults are applied in initialize() fallback.
  const env = import.meta.env as unknown as Record<string, string | undefined>;

  const portRaw = env.VITE_PEERJS_PORT;
  const secureRaw = env.VITE_PEERJS_SECURE;

  return {
    host: env.VITE_PEERJS_HOST,
    path: env.VITE_PEERJS_PATH,
    key: env.VITE_PEERJS_KEY,
    port: portRaw ? Number(portRaw) : undefined,
    secure: secureRaw ? secureRaw === "true" : undefined
  };
};

export class PeerService {
  private peer: Peer | null = null;
  private initializedPeerId: PeerId | null = null;
  private connections: Map<PeerId, DataConnection> = new Map();
  private eventListeners: Array<(event: PeerEvent) => void> = [];
  private connectionListeners: Array<(peerId: PeerId, status: "connected" | "disconnected") => void> = [];
  private pendingSends: Map<PeerId, string[]> = new Map();
  private signalingConnected = false;
  private initSeq = 0;
  private disconnectSeq = 0;
  private lastInitReason: string | null = null;

  private formatReason(reason?: string) {
    const r = (reason ?? "").trim();
    return r.length > 0 ? r : "(unspecified)";
  }

  async initialize(peerId: PeerId, options?: { reason?: string }): Promise<void> {
    const initId = (this.initSeq += 1);
    const reason = this.formatReason(options?.reason);
    this.lastInitReason = reason;
    console.log(`[PeerService] init#${initId} start peerId=${peerId} reason=${reason}`);
    const baseOptions = {
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" }
        ]
      }
    };

    const env = getPeerJsEnvConfig();
    console.log(`[PeerService] Environment config:`, env);

    // Canonical behavior: signaling server is env-driven (see app/.env.local).
    // Avoid silently falling back to unrelated public servers when env is missing.
    const host = env.host;
    if (!host) {
      throw new Error(
        "PeerJS signaling host is not configured. Set VITE_PEERJS_HOST (and optionally VITE_PEERJS_PORT/VITE_PEERJS_PATH/VITE_PEERJS_SECURE/VITE_PEERJS_KEY)."
      );
    }

    // PeerJS `path` should match the PeerServer mount path (commonly '/peerjs').
    const attempts: Array<{ label: string; options: Record<string, unknown> }> = [
      {
        label: "primary",
        options: {
          ...baseOptions,
          host,
          port: env.port ?? 443,
          path: env.path ?? "/peerjs",
          secure: env.secure ?? true,
          key: env.key ?? "peerjs"
        }
      }
    ];

    const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

    let lastError: unknown = null;
    for (const attempt of attempts) {
      console.log(`[PeerService] Attempting: ${attempt.label}`, attempt.options);
      // Longer retry loop for transient server issues (connection drops, timeouts)
      // "Lost connection to server" needs multiple retries with delays
      const retryDelaysMs = [0, 500, 1500, 3000];
      for (let retryIndex = 0; retryIndex < retryDelaysMs.length; retryIndex += 1) {
        try {
          if (retryDelaysMs[retryIndex] > 0) {
            console.log(`[PeerService] Waiting ${retryDelaysMs[retryIndex]}ms before retry...`);
            await sleep(retryDelaysMs[retryIndex]);
          }
          await this.initializeOnce(peerId, attempt.options, { initId, reason });
          console.log(`[PeerService] init#${initId} ok (${attempt.label}) peerId=${peerId}`);
          return;
        } catch (err) {
          lastError = err;

          // If the id is unavailable (already taken), retries/fallback servers won't help.
          // This commonly happens with multi-tab or when a previous runtime hasn't been released yet.
          // Let the caller pick a new peerId immediately.
          const errAny = err as { type?: string; message?: string };
          const message = typeof errAny?.message === "string" ? errAny.message : "";
          if (errAny?.type === "unavailable-id" || /\bis taken\b/i.test(message)) {
            console.warn(`[PeerService] PeerId is unavailable (taken): ${peerId}`);
            try {
              this.disconnect();
            } catch {
              // ignore cleanup failures
            }
            throw err instanceof Error ? err : new Error(message || "PeerId is unavailable");
          }

          console.warn(`[PeerService] init#${initId} ${attempt.label} (retry ${retryIndex}/${retryDelaysMs.length - 1}) failed:`, err);
          try {
            this.disconnect({ reason: `init#${initId} cleanup after failure` });
          } catch {
            // ignore cleanup failures
          }
        }
      }
    }

    const message =
      lastError instanceof Error
        ? lastError.message
        : "Could not connect to PeerJS signaling server.";
    const fullError = `PeerJS signaling unavailable (${message}). Check network/firewall/VPN, or set VITE_PEERJS_HOST/VITE_PEERJS_PATH/VITE_PEERJS_PORT.`;
    console.error(`[PeerService] init#${initId} exhausted retries:`, fullError);
    throw new Error(fullError);
  }

  private initializeOnce(
    peerId: PeerId,
    options: Record<string, unknown>,
    ctx: { initId: number; reason: string }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`[PeerService] init#${ctx.initId} create Peer(peerId=${peerId}) reason=${ctx.reason}`, options);
      this.peer = new Peer(peerId, options as never);

      let opened = false;
      this.signalingConnected = false;

      // Set a timeout to catch connection issues like "Lost connection to server"
      const initTimeout = window.setTimeout(() => {
        console.warn(
          `[PeerService] init#${ctx.initId} timeout (peerId=${peerId}) - no 'open' after 15s (reason=${ctx.reason})`
        );
        if (this.peer) {
          this.peer.destroy();
          this.peer = null;
        }
        reject(new Error("PeerJS initialization timeout - connection took too long"));
      }, 15_000);

      this.peer.on("open", () => {
        window.clearTimeout(initTimeout);
        opened = true;
        this.signalingConnected = true;
        this.initializedPeerId = peerId;
        console.log(`[PeerService] init#${ctx.initId} open peerId=${peerId} reason=${ctx.reason}`);
        resolve();
      });

      this.peer.on("error", (err) => {
        window.clearTimeout(initTimeout);
        console.error(`[PeerService] init#${ctx.initId} error (peerId=${peerId} reason=${ctx.reason}):`, err);
        reject(err);
      });

      this.peer.on("disconnected", () => {
        console.warn(
          opened
            ? `[PeerService] init#${ctx.initId} signaling disconnected (peerId=${peerId}); reconnecting (reason=${ctx.reason})`
            : `[PeerService] init#${ctx.initId} signaling disconnected during init (peerId=${peerId} reason=${ctx.reason})`
        );
        this.signalingConnected = false;
        window.clearTimeout(initTimeout);
        try {
          console.log(`[PeerService] init#${ctx.initId} peer.reconnect() (peerId=${peerId})`);
          this.peer?.reconnect();
        } catch {
          console.warn(`[PeerService] init#${ctx.initId} peer.reconnect() threw (peerId=${peerId})`);
          // ignore
        }
        if (!opened) reject(new Error("Peer disconnected during initialization"));
      });

      this.peer.on("close", () => {
        this.signalingConnected = false;
        console.warn(`[PeerService] init#${ctx.initId} peer close (peerId=${peerId} reason=${ctx.reason})`);
      });

      this.peer.on("connection", (conn) => this.handleConnection(conn, "incoming", ctx));
    });
  }

  private handleConnection(
    conn: DataConnection,
    kind: "incoming" | "outgoing",
    ctx?: { initId: number; reason: string }
  ): void {
    const peerId = conn.peer as PeerId;
    this.connections.set(peerId, conn);
    const meta = ctx ? `init#${ctx.initId} ${ctx.reason}` : "(unknown-init)";
    console.log(`[PeerService] conn ${kind} from=${peerId} open=${String(conn.open)} ${meta}`);

    this.connectionListeners.forEach((listener) => listener(peerId, "connected"));

    conn.on("open", () => {
      console.log(`[PeerService] conn open peer=${peerId} kind=${kind}`);
    });

    conn.on("data", (data: unknown) => {
      const event = this.tryParsePeerEvent(data);
      if (!event) {
        console.warn(`[PeerService] Failed to parse peer event from ${peerId}`);
        return;
      }
      this.eventListeners.forEach((listener) => listener(event));
    });

    conn.on("close", () => {
      console.log(`[PeerService] Connection closed from ${peerId}`);
      const current = this.connections.get(peerId);
      if (current === conn) this.connections.delete(peerId);
      this.connectionListeners.forEach((listener) => listener(peerId, "disconnected"));
    });

    conn.on("error", (err) => {
      console.error(`Connection error with ${peerId}:`, err);
      const current = this.connections.get(peerId);
      if (current === conn) this.connections.delete(peerId);
      this.connectionListeners.forEach((listener) => listener(peerId, "disconnected"));
    });
  }

  async connectToPeer(peerId: PeerId, options?: { timeoutMs?: number }): Promise<DataConnection> {
    if (!this.peer) throw new Error("Peer not initialized");

    console.log(
      `[PeerService] connectToPeer target=${peerId} from=${this.initializedPeerId ?? "(uninitialized)"} reason=${this.lastInitReason ?? "(unknown)"}`
    );
    const conn = this.peer.connect(peerId, { reliable: true });
    const timeoutMs = options?.timeoutMs ?? 10_000;

    return new Promise((resolve, reject) => {
      let settled = false;
      const resolveOnce = (value: DataConnection) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutHandle);
        resolve(value);
      };

      const rejectOnce = (error: unknown) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutHandle);
        reject(error);
      };

      const timeoutHandle = window.setTimeout(() => {
        try {
          conn.close();
        } catch {
          // ignore
        }
        rejectOnce(new Error(`PeerJS connect timeout after ${timeoutMs}ms to ${peerId}`));
      }, timeoutMs);

      conn.on("open", () => {
        console.log(`[PeerService] Connection opened to ${peerId}`);
        this.handleConnection(conn, "outgoing");
        resolveOnce(conn);
      });

      conn.on("error", (err) => {
        console.error(`[PeerService] Connection error to ${peerId}:`, err);
        rejectOnce(err);
      });
    });
  }

  broadcast(event: PeerEvent): void {
    const data = JSON.stringify(event);
    this.connections.forEach((conn) => {
      try {
        if (!conn.open) return;
        conn.send(data);
      } catch (err) {
        console.error(`Failed to send to ${conn.peer}:`, err);
      }
    });
  }

  sendTo(peerId: PeerId, event: PeerEvent): void {
    const conn = this.connections.get(peerId);
    if (conn) {
      try {
        const data = JSON.stringify(event);

        // Some PeerJS implementations throw if you send before the connection is fully open.
        // Queue the send and flush on `open` to avoid dropping critical messages like `room_snapshot`.
        if (!conn.open) {
          const pending = this.pendingSends.get(peerId) ?? [];
          pending.push(data);
          this.pendingSends.set(peerId, pending);

          const anyConn = conn as unknown as {
            on: (name: string, cb: (...args: unknown[]) => void) => void;
            removeListener?: (name: string, cb: (...args: unknown[]) => void) => void;
          };

          const flush = () => {
            const queued = this.pendingSends.get(peerId) ?? [];
            this.pendingSends.delete(peerId);
            for (const item of queued) {
              try {
                if (!conn.open) break;
                conn.send(item);
              } catch {
                break;
              }
            }
          };

          const onOpen = () => {
            cleanup();
            flush();
          };

          const cleanup = () => {
            try {
              anyConn.removeListener?.("open", onOpen);
            } catch {
              // ignore
            }
          };

          anyConn.on("open", onOpen);
          return;
        }

        conn.send(data);
      } catch (err) {
        console.error(`Failed to send to ${peerId}:`, err);
      }
    }
  }

  onEvent(listener: (event: PeerEvent) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      const idx = this.eventListeners.indexOf(listener);
      if (idx > -1) this.eventListeners.splice(idx, 1);
    };
  }

  onConnectionChange(listener: (peerId: PeerId, status: "connected" | "disconnected") => void): () => void {
    this.connectionListeners.push(listener);
    return () => {
      const idx = this.connectionListeners.indexOf(listener);
      if (idx > -1) this.connectionListeners.splice(idx, 1);
    };
  }

  getPeerIds(): PeerId[] {
    return Array.from(this.connections.keys());
  }

  getPeerId(): PeerId | null {
    return this.initializedPeerId;
  }

  isSignalingConnected(): boolean {
    return this.signalingConnected;
  }

  disconnect(): void;
  disconnect(options?: { reason?: string }): void;
  disconnect(options?: { reason?: string }): void {
    const disconnectId = (this.disconnectSeq += 1);
    const reason = this.formatReason(options?.reason);
    console.warn(
      `[PeerService] disconnect#${disconnectId} reason=${reason} peerId=${this.initializedPeerId ?? "(none)"} conns=${this.connections.size}`
    );

    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    this.pendingSends.clear();
    this.initializedPeerId = null;
    this.signalingConnected = false;
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }

  private tryParsePeerEvent(data: unknown): PeerEvent | null {
    if (typeof data !== "string") return null;
    try {
      const parsed = JSON.parse(data) as unknown;
      if (typeof parsed !== "object" || parsed === null) return null;
      if (!("type" in parsed && "senderId" in parsed && "roomId" in parsed && "timestamp" in parsed)) return null;

      const raw = parsed as Record<string, unknown>;
      const hostEpoch = typeof raw.hostEpoch === "number" ? raw.hostEpoch : 0;
      return { ...(raw as PeerEvent), hostEpoch };
    } catch {
      return null;
    }
  }
}

export const peerService = new PeerService();
