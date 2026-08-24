// Cloudflare Turnstile — klucz publiczny (site key) może być jawny w kodzie.
export const TURNSTILE_SITE_KEY = "<TU_WKLEJ_SITE_KEY>";

/** Komunikat pokazywany, gdy weryfikacja antybotowa nie przeszła. */
export const TURNSTILE_ERROR_MESSAGE =
  "Weryfikacja antybotowa nie powiodła się. Odśwież stronę i spróbuj ponownie.";

/** Rozpoznaje błędy captchy zwracane przez Supabase Auth. */
export const isCaptchaError = (error: unknown): boolean => {
  const raw =
    typeof error === "string"
      ? error
      : ((error as { message?: string } | null)?.message ?? "");
  const msg = raw.toLowerCase();
  return msg.includes("captcha");
};
