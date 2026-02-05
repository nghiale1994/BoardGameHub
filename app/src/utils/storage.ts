// Wrapper for browser storage with type safety
const storageKeyPrefix = "boardgamehub.";

export const storage = {
  getItem<T>(key: string, defaultValue: T | null = null): T | null {
    const prefixedKey = storageKeyPrefix + key;
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(prefixedKey);
    } catch {
      return defaultValue;
    }
    if (!raw) return defaultValue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  },

  setItem<T>(key: string, value: T): void {
    const prefixedKey = storageKeyPrefix + key;
    try {
      localStorage.setItem(prefixedKey, JSON.stringify(value));
    } catch {
      // Ignore storage failures (quota/privacy), keep runtime functional.
    }
  },

  removeItem(key: string): void {
    const prefixedKey = storageKeyPrefix + key;
    try {
      localStorage.removeItem(prefixedKey);
    } catch {
      // Ignore
    }
  },

  clear(): void {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(storageKeyPrefix)) {
          keys.push(key);
        }
      }
      keys.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Ignore
    }
  }
};
