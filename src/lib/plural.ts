/**
 * Polska odmiana liczebników (formy: 1 / 2–4 / 5+).
 * np. pluralPl(1, "atrakcja", "atrakcje", "atrakcji") → "atrakcja"
 */
export function pluralPl(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(Math.trunc(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (abs === 1) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** Samo słowo: "atrakcja" / "atrakcje" / "atrakcji" */
export const activityWord = (n: number) => pluralPl(n, "atrakcja", "atrakcje", "atrakcji");

/** Liczba + słowo: "1 atrakcja", "552 atrakcje", "5 atrakcji" */
export const activityCount = (n: number) => `${n} ${activityWord(n)}`;

/**
 * Orzeczenie zgodne z liczebnikiem: 1 → "spełnia", 2–4 → "spełniają", 5+ → "spełnia"
 * (bo "5 atrakcji" to dopełniacz i wymaga liczby pojedynczej czasownika).
 */
export const verbPl = (n: number, singular: string, plural: string) =>
  pluralPl(n, singular, plural, singular);