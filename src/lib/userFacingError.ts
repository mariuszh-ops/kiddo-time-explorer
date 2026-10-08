/**
 * AF-10-005 / AF-10-036: komunikat błędu zapisu (formularze zgłoszeń i opinii) dla użytkownika.
 *
 * Surowego `error.message` z Supabase / PostgREST / sieci NIE pokazujemy: bywa angielski
 * („Failed to fetch”, „TypeError: …”) i nie mówi, co zrobić. Zamiast niego idzie podany
 * polski komunikat z krokiem do wykonania.
 *
 * Wyjątek: limity zgłoszeń i opinii pilnują triggery w bazie
 * (`raise sqlstate 'PT429' using message = 'Zbyt wiele zgłoszeń … Spróbuj ponownie za godzinę.'`)
 * i to one niosą treść dla użytkownika (wzorzec N-06). Taki tekst przepuszczamy, ale tylko
 * z kodem triggera (PT429 / P0001) i tylko po polsku (ma polską literę) — angielski 429
 * z bramki albo sieci dostaje polski komunikat zastępczy.
 */
const POLISH_LETTER = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;

/** Ogólny limit zgłoszeń — ten sam tekst co globalny limit w triggerach bazy. */
export const RATE_LIMIT_MESSAGE = "Zbyt wiele zgłoszeń w tej chwili. Spróbuj ponownie później.";

type ErrorLike = { code?: unknown; status?: unknown; message?: unknown } | null | undefined;

const messageOf = (err: ErrorLike): string =>
  typeof err?.message === "string" ? err.message.trim() : "";

export function isRateLimitError(err: unknown): boolean {
  const e = err as ErrorLike;
  const msg = messageOf(e).toLowerCase();
  return (
    e?.code === "PT429" ||
    e?.status === 429 ||
    msg.includes("rate limit") ||
    msg.includes("too many") ||
    msg.includes("zbyt wiele")
  );
}

/**
 * @param fallback polski komunikat z działaniem („… Spróbuj ponownie …”) dla każdego innego błędu
 * @param rateLimitFallback komunikat dla limitu bez polskiej treści z triggera
 */
export function userFacingError(
  err: unknown,
  fallback: string,
  rateLimitFallback: string = fallback,
): string {
  const e = err as ErrorLike;
  const msg = messageOf(e);
  if ((e?.code === "PT429" || e?.code === "P0001") && POLISH_LETTER.test(msg)) return msg;
  if (isRateLimitError(e)) return rateLimitFallback;
  return fallback;
}
