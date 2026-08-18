/**
 * Globalna obsługa uszkodzonej / wygasłej sesji (S-127).
 *
 * Klient katalogu wykrywa 401 / PGRST301 i woła `reportInvalidSession()`.
 * Komponent `SessionExpiredHandler` nasłuchuje i pokazuje jednorazowy
 * komunikat z możliwością ponownego logowania.
 */

type Listener = () => void;

const listeners = new Set<Listener>();
let alreadyReported = false;

export function onInvalidSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Zgłoś nieważny token — tylko raz na cykl życia strony. */
export function reportInvalidSession(): void {
  if (alreadyReported) return;
  alreadyReported = true;
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // silent
    }
  });
}
