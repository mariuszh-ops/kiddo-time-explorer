/**
 * Globalna obsługa uszkodzonej / wygasłej sesji (S-127).
 *
 * Klient katalogu wykrywa 401 / PGRST301 i woła `reportInvalidSession()`.
 * Komponent `SessionExpiredHandler` nasłuchuje i pokazuje jednorazowy
 * komunikat z możliwością ponownego logowania.
 *
 * X-H-01: powód bywa DWOJAKI i użytkownik może naprawić tylko jeden z nich.
 * "token" to zwykłe wygaśnięcie — jedyne wyjście to zalogować się ponownie.
 * "zegar" to rozjechany zegar urządzenia: `exp` tokenu porównuje się z czasem
 * KLIENTA, więc gdy urządzenie wyprzedza serwer o więcej niż TTL tokenu,
 * każdy świeżo wydany token rodzi się "przeterminowany" i odświeżanie kręci
 * się w kółko. Ponowne logowanie tego NIE naprawi — trzeba ustawić zegar.
 */

/** Dlaczego sesja przestała działać — decyduje o treści komunikatu. */
export type InvalidSessionReason = "token" | "zegar";

type Listener = (reason: InvalidSessionReason) => void;

const listeners = new Set<Listener>();
let alreadyReported = false;

export function onInvalidSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Zgłoś nieważny token — tylko raz na cykl życia strony. */
export function reportInvalidSession(reason: InvalidSessionReason = "token"): void {
  if (alreadyReported) return;
  alreadyReported = true;
  listeners.forEach((l) => {
    try {
      l(reason);
    } catch {
      // silent
    }
  });
}
