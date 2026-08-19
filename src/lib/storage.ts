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

/* ------------------------------------------------------------------ *
 * Higiena sesji na wspólnym komputerze (S-184)
 * ------------------------------------------------------------------ */

/** Prefiksy WSZYSTKICH kluczy aplikacji trzymanych w localStorage. */
const APP_PREFIXES = ["ff_", "familyfun_"] as const;

/** Ustawienia urządzenia, które nie zawierają danych konkretnego konta. */
const LOGOUT_PRESERVED_KEYS = new Set<string>([
  STORAGE_KEYS.COOKIE_CONSENT,
  STORAGE_KEYS.ONBOARDING_SEEN,
]);

/** Znacznik ostatniego wylogowania (poza prefiksami aplikacji — nie jest czyszczony). */
const LAST_LOGOUT_KEY = "auth_last_logout";

/** Znacznik czasu powstania danych gościa (czyszczony razem z danymi). */
const GUEST_SINCE_KEY = "ff_guest_data_since";

const isAppKey = (key: string) => APP_PREFIXES.some((p) => key.startsWith(p));

/**
 * Usuń WSZYSTKIE dane aplikacji z localStorage (ff_*, familyfun_*).
 * Wywoływane przy wylogowaniu i przy wygaśnięciu sesji, żeby kolejny
 * użytkownik tej przeglądarki nie zobaczył cudzych zapisów.
 */
export function clearAllAppStorage(): void {
  if (!available()) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && isAppKey(key) && !LOGOUT_PRESERVED_KEYS.has(key)) keys.push(key);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // silent
  }
}

/** Zapisz moment wylogowania — dane gościa starsze od niego nie są „z tej sesji". */
export function markLoggedOutNow(): void {
  setRawItem(LAST_LOGOUT_KEY, String(Date.now()));
}

/** Oznacz, że w tej sesji przeglądarki gość zapisał jakiekolwiek dane. */
export function touchGuestDataMarker(): void {
  if (getRawItem(GUEST_SINCE_KEY)) return;
  setRawItem(GUEST_SINCE_KEY, String(Date.now()));
}

/**
 * Znacznik istnieje wyłącznie wtedy, gdy gość ma faktycznie niepuste dane,
 * które mogą zostać zaproponowane do migracji.
 */
export function syncGuestDataMarker(): void {
  const guestKeys = [
    STORAGE_KEYS.FAVORITES,
    STORAGE_KEYS.WANT_TO_VISIT,
    "familyfun_user_ratings",
  ];
  const hasGuestData = guestKeys.some((key) => {
    const raw = getRawItem(key);
    if (!raw) return false;
    try {
      const value: unknown = JSON.parse(raw);
      return Array.isArray(value) && value.length > 0;
    } catch {
      return false;
    }
  });

  if (hasGuestData) touchGuestDataMarker();
  else removeItem(GUEST_SINCE_KEY);
}

/** Czy dane gościa powstały PO ostatnim wylogowaniu (czyli w tej sesji)? */
export function hasFreshGuestData(): boolean {
  const since = Number(getRawItem(GUEST_SINCE_KEY) ?? 0);
  if (!Number.isFinite(since) || since <= 0) return false;
  const lastLogout = Number(getRawItem(LAST_LOGOUT_KEY) ?? 0);
  return since > (Number.isFinite(lastLogout) ? lastLogout : 0);
}

/** Klucz lokalnego lustra przypisany do właściciela: `ff_favorites:<user_id>`. */
export function scopedKey(base: string, userId: string): string {
  return `${base}:${userId}`;
}

/** Usuń lokalne lustra należące do INNYCH kont (obcy identyfikator w kluczu). */
export function clearForeignScopedKeys(userId: string): void {
  if (!available()) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !isAppKey(key)) continue;
      const idx = key.lastIndexOf(":");
      if (idx === -1) continue;
      if (key.slice(idx + 1) !== userId) keys.push(key);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // silent
  }
}
