import { openDB, type DBSchema } from "idb";
import { storage } from "../utils/storage";
import type { RoomMetadata, RoomSnapshot } from "../utils/types";

const HUB_DB_NAME = "boardgamehub";
const HUB_DB_VERSION = 1;

const RECENT_GAMES_STORE_KEY = "boardgamehub.recentGames";
const LEGACY_RECENT_ROOMS_STORE_KEY = "boardgamehub.recentRooms";
const MAX_RECENT_GAMES = 20;

type PreferenceKey =
  | "displayName"
  | "language"
  | "theme"
  | "chat.showConversation"
  | "chat.showGameEvents"
  | "recentRooms";

export type RecentRoom = {
  id: string;
  name: string;
  players: number;
  updatedAt: number;
};

interface HubDbSchema extends DBSchema {
  preferences: {
    key: PreferenceKey;
    value: unknown;
  };
  metadata: {
    key: string; // roomId
    value: RoomMetadata;
  };
  snapshots: {
    key: string; // roomId
    value: RoomSnapshot;
  };
  events: {
    key: string;
    value: unknown;
  };
}

const getDb = () =>
  openDB<HubDbSchema>(HUB_DB_NAME, HUB_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("preferences")) {
        db.createObjectStore("preferences");
      }
      if (!db.objectStoreNames.contains("metadata")) {
        db.createObjectStore("metadata");
      }
      if (!db.objectStoreNames.contains("snapshots")) {
        db.createObjectStore("snapshots");
      }
      if (!db.objectStoreNames.contains("events")) {
        db.createObjectStore("events");
      }
    }
  });

const CHANNEL_NAME = "boardgamehub.sync";

const publish = (message: unknown) => {
  if (typeof window === "undefined") return;
  if (!("BroadcastChannel" in window)) return;
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.postMessage(message);
  channel.close();
};

export const persistence = {
  subscribe(callback: (message: unknown) => void): (() => void) | null {
    if (typeof window === "undefined") return null;
    if (!("BroadcastChannel" in window)) return null;
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event) => callback(event.data);
    return () => channel.close();
  },

  async getPreference<T>(key: PreferenceKey, fallback: T): Promise<T> {
    try {
      const db = await getDb();
      const value = (await db.get("preferences", key)) as T | undefined;
      if (value !== undefined) return value;
    } catch {
      // Ignore and fallback
    }

    const local = storage.getItem<T>(`pref.${key}`, null);
    return (local ?? fallback) as T;
  },

  async setPreference<T>(key: PreferenceKey, value: T): Promise<void> {
    try {
      const db = await getDb();
      await db.put("preferences", value as unknown, key);
    } catch {
      // Ignore and keep fallback
    }

    storage.setItem(`pref.${key}`, value);
    publish({ type: "pref_updated", key });
  },

  async getDisplayName(): Promise<string> {
    const migratedPlain = localStorage.getItem("boardgamehub.displayName");
    if (migratedPlain && !storage.getItem<string | null>("displayName", null)) {
      storage.setItem("displayName", migratedPlain);
    }

    return this.getPreference("displayName", storage.getItem("displayName", "") || "");
  },

  async setDisplayName(name: string): Promise<void> {
    storage.setItem("displayName", name);
    await this.setPreference("displayName", name);
  },

  async getRecentRooms(): Promise<RecentRoom[]> {
    const fallback = (() => {
      const raw =
        localStorage.getItem(RECENT_GAMES_STORE_KEY) ??
        localStorage.getItem(LEGACY_RECENT_ROOMS_STORE_KEY);
      if (!raw) return [] as RecentRoom[];
      try {
        const parsed = JSON.parse(raw) as Array<
          Omit<RecentRoom, "updatedAt"> & { updatedAt?: number | string }
        >;
        if (!Array.isArray(parsed)) return [];

        return parsed
          .filter((r) => r && typeof r.id === "string" && typeof r.name === "string")
          .map((r) => {
            const updatedAt = (() => {
              if (typeof r.updatedAt === "number" && Number.isFinite(r.updatedAt)) return r.updatedAt;
              if (typeof r.updatedAt === "string") {
                const asNumber = Number(r.updatedAt);
                if (Number.isFinite(asNumber)) return asNumber;
                const asDate = Date.parse(r.updatedAt);
                if (Number.isFinite(asDate)) return asDate;
              }
              return Date.now();
            })();

            return {
              id: r.id,
              name: r.name,
              players: typeof r.players === "number" ? r.players : 0,
              updatedAt
            } satisfies RecentRoom;
          })
          .slice(0, MAX_RECENT_GAMES);
      } catch {
        return [];
      }
    })();

    const rooms = await this.getPreference<RecentRoom[]>("recentRooms", fallback);
    return Array.isArray(rooms) ? rooms : fallback;
  },

  async setRecentRooms(rooms: RecentRoom[]): Promise<void> {
    await this.setPreference("recentRooms", rooms);

    // LocalStorage fallback compatibility (see docs/features/HomePage/RecentGames/recent_games_config.yaml)
    try {
      localStorage.setItem(RECENT_GAMES_STORE_KEY, JSON.stringify(rooms));
    } catch {
      // Ignore
    }
  },

  async upsertRecentRoom(room: Omit<RecentRoom, "updatedAt">): Promise<void> {
    const existing = await this.getRecentRooms();
    const updatedAt = Date.now();
    const next = [{ ...room, updatedAt }, ...existing.filter((r) => r.id !== room.id)].slice(0, MAX_RECENT_GAMES);
    await this.setRecentRooms(next);
  },

  async clearAll(): Promise<void> {
    try {
      const db = await getDb();
      await Promise.all([
        db.clear("preferences"),
        db.clear("metadata"),
        db.clear("snapshots"),
        db.clear("events")
      ]);
    } catch {
      // Ignore
    }

    storage.clear();

    try {
      localStorage.removeItem(RECENT_GAMES_STORE_KEY);
      localStorage.removeItem(LEGACY_RECENT_ROOMS_STORE_KEY);
    } catch {
      // Ignore
    }
    publish({ type: "cleared" });
  }
} as const;
