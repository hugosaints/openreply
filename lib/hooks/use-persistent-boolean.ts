"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Boolean UI preference persisted in localStorage (e.g. collapsed sidebar).
 *
 * Built on useSyncExternalStore so the server render and first client render
 * agree (the server snapshot is always `fallback`), then the stored value is
 * picked up without a setState-in-effect round trip. Writes notify every
 * subscriber in this tab; the native `storage` event covers other tabs.
 */
const EVENT = "openreply:pref-change";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

export function usePersistentBoolean(key: string, fallback = false) {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      try {
        const raw = window.localStorage.getItem(key);
        return raw === null ? fallback : raw === "1";
      } catch {
        return fallback;
      }
    },
    () => fallback,
  );

  const setValue = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      try {
        const raw = window.localStorage.getItem(key);
        const prev = raw === null ? fallback : raw === "1";
        const resolved = typeof next === "function" ? next(prev) : next;
        window.localStorage.setItem(key, resolved ? "1" : "0");
      } catch {
        // Storage can be unavailable (private mode, quota); the preference
        // simply won't persist.
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key, fallback],
  );

  return [value, setValue] as const;
}
