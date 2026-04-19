/**
 * Storage abstraction layer.
 *
 * Single source of truth for client-side persistence. Components and contexts
 * use these functions instead of calling localStorage directly. This allows
 * swapping the underlying storage (e.g. to Supabase) by changing only this file.
 *
 * All functions are safe against:
 * - localStorage being unavailable (SSR, private mode, quota exceeded)
 * - corrupted JSON in storage
 * - missing keys (returns fallback)
 */

const isStorageAvailable = (): boolean => {
  try {
    const testKey = "__ff_storage_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

let _available: boolean | null = null;
const available = () => (_available ??= isStorageAvailable());

/**
 * Read a typed value from storage. Returns fallback if missing or corrupted.
 */
export function getItem<T>(key: string, fallback: T): T {
  if (!available()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Read a raw string value from storage. Returns null if missing.
 * Use this when the stored value is already a plain string (not JSON-encoded).
 */
export function getRawItem(key: string): string | null {
  if (!available()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Write a typed value to storage. Fails silently if storage unavailable/full.
 */
export function setItem<T>(key: string, value: T): void {
  if (!available()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded or other error — silent
  }
}

/**
 * Write a raw string to storage (not JSON-encoded).
 */
export function setRawItem(key: string, value: string): void {
  if (!available()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // silent
  }
}

/**
 * Remove a key from storage.
 */
export function removeItem(key: string): void {
  if (!available()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // silent
  }
}

/**
 * Centralized key registry. All storage keys used by the app are listed here,
 * prefixed with "ff_" (FamilyFun namespace).
 *
 * When migrating to a backend, this registry tells us exactly what data needs
 * to be persisted server-side.
 */
export const STORAGE_KEYS = {
  FAVORITES: "ff_favorites",
  WANT_TO_VISIT: "ff_want_to_visit",
  FAMILY_PROFILE: "ff_family_profile",
  ONBOARDING_SEEN: "ff_onboarding_seen",
  USER_CITY: "ff_user_city",
  COOKIE_CONSENT: "ff_cookie_consent",
  INLINE_RATINGS: "ff_inline_ratings",
  ADMIN_EDITS: "ff_admin_edits",
} as const;
