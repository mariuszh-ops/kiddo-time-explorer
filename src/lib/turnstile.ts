// Cloudflare Turnstile — klucz publiczny (site key) może być jawny w kodzie.
export const TURNSTILE_SITE_KEY = "0x4AAAAAAEakUz8rvyWeu4ag";

/** Komunikat pokazywany, gdy weryfikacja antybotowa nie przeszła. */
export const TURNSTILE_ERROR_MESSAGE =
  "Weryfikacja antybotowa nie powiodła się. Odśwież stronę i spróbuj ponownie.";

/** Komunikat pokazywany, gdy widget Turnstile nie wystartuje (błędny klucz, awaria, adblock). */
export const TURNSTILE_UNAVAILABLE_MESSAGE =
  "Weryfikacja antybotowa jest chwilowo niedostępna. Odśwież stronę lub zaloguj się przez Google.";

/** Rozpoznaje błędy captchy zwracane przez Supabase Auth. */
export const isCaptchaError = (error: unknown): boolean => {
  const raw =
    typeof error === "string"
      ? error
      : ((error as { message?: string } | null)?.message ?? "");
  const msg = raw.toLowerCase();
  return msg.includes("captcha");
};
