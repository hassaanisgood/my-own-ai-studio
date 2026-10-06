/**
 * Small, failure-tolerant wrapper around localStorage. Every call is wrapped in
 * try/catch: private windows, disabled storage and quota errors must never
 * break the studio — the caller simply gets `ok: false` back.
 */
const PREFIX = "studio:v1:";

export const STORAGE_KEYS = {
  history: "history",
  favorites: "favorites",
  settings: "settings",
  drafts: "drafts",
  mode: "mode",
  seeded: "seeded",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export function readJSON<T>(key: StorageKey): { ok: true; value: T | null } | { ok: false; error: unknown } {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return { ok: true, value: raw === null ? null : (JSON.parse(raw) as T) };
  } catch (error) {
    return { ok: false, error };
  }
}

export function writeJSON(key: StorageKey, value: unknown): { ok: true } | { ok: false; error: unknown } {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

export function removeKey(key: StorageKey) {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

/** Approximate bytes used by this app's keys. */
export function usedBytes(): number {
  try {
    let total = 0;
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(PREFIX)) total += (k.length + (window.localStorage.getItem(k)?.length ?? 0)) * 2;
    }
    return total;
  } catch {
    return 0;
  }
}
