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

/**
 * Liczba całkowita do pokazania w UI: grupy po 3 cyfry oddzielone twardą spacją
 * (U+00A0), także w liczbach czterocyfrowych: 1533 → „1 533”, 4883 → „4 883”.
 * Celowo bez toLocaleString("pl-PL"): CLDR dla pl grupuje dopiero od 5 cyfr
 * (wyszłoby „1533”), a twarda spacja nie pozwala złamać liczby w wąskim kaflu
 * (AF-10-053). Plik bez importów — audyt AF-10 ładuje go wprost w Node.
 */
export const formatCountPl = (n: number): string =>
  Number.isInteger(n) ? String(n).replace(/\B(?=(\d{3})+$)/g, "\u00A0") : String(n);

/** Samo słowo: "atrakcja" / "atrakcje" / "atrakcji" */
export const activityWord = (n: number) => pluralPl(n, "atrakcja", "atrakcje", "atrakcji");

/** Liczba + słowo: "1 atrakcja", "552 atrakcje", "1 533 atrakcje" (twarda spacja w liczbie) */
export const activityCount = (n: number) => `${formatCountPl(n)} ${activityWord(n)}`;

/**
 * Orzeczenie zgodne z liczebnikiem: 1 → "spełnia", 2–4 → "spełniają", 5+ → "spełnia"
 * (bo "5 atrakcji" to dopełniacz i wymaga liczby pojedynczej czasownika).
 */
export const verbPl = (n: number, singular: string, plural: string) =>
  pluralPl(n, singular, plural, singular);