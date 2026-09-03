// Cloudflare Turnstile — klucz publiczny (site key) może być jawny w kodzie.
export const TURNSTILE_SITE_KEY = "0x4AAAAAAEakUz8rvyWeu4ag";

/** Komunikat pokazywany, gdy weryfikacja antybotowa nie przeszła. */
export const TURNSTILE_ERROR_MESSAGE =
  "Weryfikacja antybotowa nie powiodła się. Odśwież stronę i spróbuj ponownie.";

/**
 * I-09: skrypt Cloudflare w ogóle się nie wczytał — wtedy (i tylko wtedy)
 * winne bywa rozszerzenie blokujące albo filtr DNS.
 */
export const TURNSTILE_BLOCKED_MESSAGE =
  "Nie udało się załadować zabezpieczenia antyspamowego. Najczęściej blokuje je rozszerzenie typu uBlock/AdGuard albo filtr DNS. Wyłącz je dla familyfun.pl albo zaloguj się przez Google.";

/**
 * I-09: skrypt Cloudflare działa (`window.turnstile` istnieje), a mimo to widget
 * nie wystartował — przyczyna jest po naszej stronie i nie wolno wysyłać
 * użytkownika na polowanie na własne rozszerzenia.
 */
export const TURNSTILE_OUR_FAULT_MESSAGE =
  "Zabezpieczenie antyspamowe nie wystartowało. To problem po naszej stronie — zaloguj się przez Google, pracujemy nad tym.";

/** Czy skrypt Cloudflare w ogóle wstał w tej przeglądarce. */
export const isTurnstileScriptLoaded = (): boolean =>
  typeof window !== "undefined" &&
  typeof (window as { turnstile?: unknown }).turnstile === "object" &&
  (window as { turnstile?: unknown }).turnstile !== null;

/**
 * Komunikat dla awarii widgetu — rozróżnia „zablokowany skrypt" (wina po stronie
 * przeglądarki użytkownika) od „skrypt jest, widget nie wstał" (wina nasza).
 */
export const turnstileUnavailableMessage = (): string =>
  isTurnstileScriptLoaded() ? TURNSTILE_OUR_FAULT_MESSAGE : TURNSTILE_BLOCKED_MESSAGE;

/** Rozpoznaje błędy captchy zwracane przez Supabase Auth. */
export const isCaptchaError = (error: unknown): boolean => {
  const raw =
    typeof error === "string"
      ? error
      : ((error as { message?: string } | null)?.message ?? "");
  const msg = raw.toLowerCase();
  return msg.includes("captcha");
};
