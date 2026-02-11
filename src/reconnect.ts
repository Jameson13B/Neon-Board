import { STORAGE_KEY_SESSION, STORAGE_KEY_BOARD_ID, SESSION_MAX_AGE_MS } from './constants.js';
import type { StoredSession } from './types.js';

/** Fallback when crypto.randomUUID is unavailable (older browsers, non-secure context). */
function randomId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface GetOrCreateBoardIdOptions {
  /** localStorage key. Defaults to `neon-board-id`. */
  storageKey?: string;
}

/**
 * Returns a persistent board id for this device (e.g. for board-only apps with no user auth).
 * Reads from localStorage; if missing, generates a UUID, stores it, and returns it.
 * Safe for SSR: when localStorage is unavailable, returns a new id each time (no persistence).
 */
export function getOrCreateBoardId(options?: GetOrCreateBoardIdOptions): string {
  const key = options?.storageKey ?? STORAGE_KEY_BOARD_ID;
  try {
    if (typeof localStorage === 'undefined') return randomId();
    let id = localStorage.getItem(key);
    if (!id) {
      id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : randomId();
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return randomId();
  }
}

export function saveSession(session: StoredSession): void {
  try {
    const payload = { ...session, storedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    if (!raw) return null;
    const session = JSON.parse(raw) as StoredSession & { storedAt?: number };
    const storedAt = session.storedAt ?? 0;
    if (Date.now() - storedAt > SESSION_MAX_AGE_MS) {
      clearSession();
      return null;
    }
    return {
      gameId: session.gameId,
      joinCode: session.joinCode,
      role: session.role,
      playerId: session.playerId,
      storedAt,
    };
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_SESSION);
  } catch {
    // ignore
  }
}
