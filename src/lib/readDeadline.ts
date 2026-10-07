/**
 * GL-7-026/030 (decyzja D4=A): aplikacyjny limit czasu dla POJEDYNCZYCH odczytow
 * - karty atrakcji (`fetchActivityBySlug`) i listy zapisanych (`fetchAllSavedRows`).
 *
 * Bez limitu zawieszony serwer trzymal szkielet ok. 67 s: postgrest-js ponawia
 * GET 3x po bledzie sieci (1 + 2 + 4 s przerwy), a kazda proba czeka do limitu
 * przegladarki. Przerwanie przez `AbortController.abort()` daje `AbortError`,
 * ktorego postgrest-js NIE ponawia - zapytanie konczy sie bledem po `ms`,
 * a ekran pokazuje komunikat z "Sprobuj ponownie".
 *
 * Celowo NIE globalnie w kliencie: mapa calego kraju (ok. 4,9 tys. pinow)
 * na slabym laczu moze legalnie trwac dluzej niz 10 s.
 */
export const READ_TIMEOUT_MS = 10_000;

export function readDeadline(ms: number = READ_TIMEOUT_MS): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  // abort() bez powodu = DOMException "AbortError" (AbortSignal.timeout dalby
  // "TimeoutError", ktory postgrest-js traktuje jak blad sieci i ponawia).
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(id) };
}
