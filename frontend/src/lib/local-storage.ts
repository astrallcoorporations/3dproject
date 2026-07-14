// A tiny Storage-like wrapper that falls back to an in-memory Map when
// window.localStorage is unavailable or throws (private-browsing modes that
// disable Web Storage, non-browser test environments, etc). Real browsers
// get real persistence; everything else degrades gracefully instead of
// crashing the app.
export type KeyValueStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function createMemoryStorage(): KeyValueStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, value),
    removeItem: (key) => void store.delete(key),
  };
}

function resolveStorage(): KeyValueStorage {
  try {
    if (typeof window === "undefined" || !window.localStorage) return createMemoryStorage();
    const probeKey = "__puppet_storage_probe__";
    window.localStorage.setItem(probeKey, "1");
    window.localStorage.removeItem(probeKey);
    return window.localStorage;
  } catch {
    return createMemoryStorage();
  }
}

export const safeStorage: KeyValueStorage = resolveStorage();

// Remembers which project is active so a page reload can restore its rig
// and timeline instead of starting from a blank studio. Lives here (rather
// than in project-store.ts) so files that only need the key — like the
// global test setup file — don't have to import the store module, which
// would transitively import lib/api and interfere with per-test-file
// `vi.mock("../lib/api")` hoisting.
export const ACTIVE_PROJECT_STORAGE_KEY = "puppet.activeProjectId";
