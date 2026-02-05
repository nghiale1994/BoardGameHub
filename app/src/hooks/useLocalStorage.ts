import { useCallback, useEffect, useState } from "react";
import { storage } from "../utils/storage";

export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [value, setValue] = useState<T>(() => {
    const stored = storage.getItem<T>(key);
    return stored ?? initialValue;
  });

  const setStorageValue = useCallback(
    (newValue: T | ((val: T) => T)) => {
      try {
        const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
        setValue(valueToStore);
        storage.setItem(key, valueToStore);
      } catch (error) {
        console.error(`Failed to set storage key ${key}:`, error);
      }
    },
    [key, value]
  );

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      const prefixedKey = `boardgamehub.${key}`;
      if (e.key === prefixedKey && e.newValue) {
        try {
          setValue(JSON.parse(e.newValue) as T);
        } catch (error) {
          console.error(`Failed to parse storage event for ${key}:`, error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key]);

  return [value, setStorageValue] as const;
};
