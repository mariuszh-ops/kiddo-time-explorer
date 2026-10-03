/** Jeden, wspólny placeholder dla wszystkich pól wyszukiwania. */
export const SEARCH_PLACEHOLDER = "Szukaj atrakcji, miasta lub kategorii";

/** Czyści frazę pod filtr `or(...ilike...)` w PostgREST (usuwa znaki sterujące). */
export function sanitizeSearchTerm(q: string): string {
  return q.replace(/[,()%*\\]/g, " ").trim();
}

/** Najdłuższa fraza brana z adresu (`?search=`); dłuższą obcinamy. */
export const FRAZA_Z_ADRESU_MAX = 100;

/**
 * Fraza z `?search=` bez spacji na brzegach, przycięta do FRAZA_Z_ADRESU_MAX
 * znaków (po punktach kodowych, więc emoji nie zostaje rozcięte).
 *
 * FMN-8-021: `/mazowieckie?search=` + 2000 × „ą” dawało zapytanie GET do
 * PostgREST na kilkadziesiąt tysięcy znaków (fraza dwa razy w `or(...)`),
 * które padało `net::ERR_FAILED`, a strona stała na „Wczytywanie atrakcji…”.
 */
export function frazaZAdresu(raw: string | null | undefined): string {
  const fraza = (raw ?? "").trim();
  const znaki = Array.from(fraza);
  if (znaki.length <= FRAZA_Z_ADRESU_MAX) return fraza;
  return znaki.slice(0, FRAZA_Z_ADRESU_MAX).join("").trim();
}
