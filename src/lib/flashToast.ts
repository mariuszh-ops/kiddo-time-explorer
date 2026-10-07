/**
 * GL-2-039: komunikat, który ma przeżyć pełne przeładowanie strony.
 *
 * `signOut()` kończy się `window.location.assign("/")`, więc toast wywołany
 * tuż przed nim ginie razem ze starym dokumentem. Treść odkładamy do
 * sessionStorage (wylogowanie czyści tylko localStorage) i nowy dokument
 * pokazuje ją raz — patrz `FlashToast`.
 */
const FLASH_KEY = "ff_flash_toast";
/** Starszy wpis to nie „ten” powrót po przeładowaniu — nie pokazujemy. */
const MAX_AGE_MS = 60_000;

export function queueFlashToast(message: string): void {
  try {
    sessionStorage.setItem(FLASH_KEY, JSON.stringify({ message, ts: Date.now() }));
  } catch {
    /* brak sessionStorage — komunikat zobaczy tylko stary dokument */
  }
}

/** Zwraca odłożony komunikat i od razu go kasuje (pokazujemy dokładnie raz). */
export function takeFlashToast(now: number = Date.now()): string | null {
  try {
    const raw = sessionStorage.getItem(FLASH_KEY);
    if (raw === null) return null;
    sessionStorage.removeItem(FLASH_KEY);
    const parsed = JSON.parse(raw) as { message?: unknown; ts?: unknown };
    if (typeof parsed.message !== "string" || typeof parsed.ts !== "number") return null;
    if (now - parsed.ts > MAX_AGE_MS) return null;
    return parsed.message;
  } catch {
    return null;
  }
}
