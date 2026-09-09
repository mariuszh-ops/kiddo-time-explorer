import { getRawItem, setRawItem, STORAGE_KEYS } from "@/lib/storage";

/**
 * I-07b: zgoda na Regulamin i Politykę prywatności przy logowaniu Google.
 *
 * DWA SLADY, DWIE ROLE — to nie jest duplikat:
 *  - localStorage (`ff_terms_accepted`) to BRAMKA. Musi dzialac PRZED
 *    `signInWithOAuth`, a w tym momencie nie ma jeszcze sesji, wiec nie da sie
 *    zapytac bazy, czy dane konto zgode juz ma. Pamiec jest wiec urzadzeniowa.
 *  - `user_metadata.terms_accepted_at` to DOWOD (RODO art. 7 ust. 1 — trzeba
 *    umiec wykazac zgode). Zapisywany dopiero PO powrocie z OAuth, gdy znamy
 *    konto. Nie da sie go uzyc jako bramki, bo wtedy redirect juz poszedl.
 *
 * Skutek uboczny do zaakceptowania: nowa przegladarka pyta o zgode raz jeszcze,
 * bo przed redirectem konta nie da sie rozpoznac. Data pierwszej zgody w bazie
 * sie przy tym NIE nadpisuje.
 */

/** Klucz w `user_metadata` — serwerowy dowod zgody. */
export const TERMS_METADATA_KEY = "terms_accepted_at";

/** Rzucane przez `signInWithGoogle`, gdy zgody brak. Nie jest bledem sieci. */
export const TERMS_REQUIRED_ERROR = "TERMS_REQUIRED";

/**
 * Zapasowa pamiec na czas jednej karty. localStorage bywa niedostepny
 * (tryb prywatny, zablokowane dane witryny) i zapis cichnie w try/catch.
 * Bez tego zapasu uzytkownik zaznaczalby zgode, bramka i tak by ja odrzucila,
 * a on zobaczylby „Nie udalo sie zalogowac" bez zadnej drogi dalej.
 */
let inMemoryAcceptedAt: string | null = null;

/** Czy na TYM urzadzeniu zgoda zostala juz udzielona. */
export function hasAcceptedTerms(): boolean {
  return Boolean(getTermsAcceptedAt());
}

/** Data zgody z tego urzadzenia (ISO) albo null. */
export function getTermsAcceptedAt(): string | null {
  const raw = getRawItem(STORAGE_KEYS.TERMS_ACCEPTED);
  if (raw && raw.trim()) return raw;
  return inMemoryAcceptedAt;
}

/**
 * Zapisz zgode na tym urzadzeniu. Istniejacej daty NIE nadpisuje — liczy sie
 * moment pierwszej zgody, nie ostatniego logowania.
 */
export function recordTermsAccepted(at: string = new Date().toISOString()): void {
  if (hasAcceptedTerms()) return;
  inMemoryAcceptedAt = at;
  setRawItem(STORAGE_KEYS.TERMS_ACCEPTED, at);
}

/** Tylko do testow — czysci zapas pamieciowy miedzy przypadkami. */
export function __resetTermsConsentMemory(): void {
  inMemoryAcceptedAt = null;
}
