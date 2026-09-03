// src/lib/formatReviewCount.ts
// Liczby opinii Google odświeżamy rzadko, więc dokładna wartość („268 833 opinii")
// jest nieaktualna już następnego dnia. Pokazujemy kubełek zaokrąglony W DÓŁ z „+",
// który przy starzejących się danych pozostaje prawdziwy (audyt: A-14, 03.09.2026).
const NB = "\u00A0"; // twarda spacja: „268 tys.+ opinii" nie łamie się w karcie
const plural = (n: number) => (n === 1 ? "opinia" : n <= 4 ? "opinie" : "opinii");

/** Liczba opinii Google jako kubełek zaokrąglony W DÓŁ z plusem. null = brak opinii. */
export const formatReviewCount = (count?: number | null): string | null => {
  if (count == null || count < 1) return null;
  if (count < 10) return `${count}${NB}${plural(count)}`;                  // 7 opinii
  if (count < 100) return `${Math.floor(count / 10) * 10}+${NB}opinii`;    // 47 -> 40+ opinii
  if (count < 1000) return `${Math.floor(count / 100) * 100}+${NB}opinii`; // 523 -> 500+ opinii
  const step = count < 10000 ? 500 : 1000;             // 1 730 -> 1,5 tys.+ ; 268 833 -> 268 tys.+
  const tys = ((Math.floor(count / step) * step) / 1000).toLocaleString("pl-PL");
  return `${tys}${NB}tys.+${NB}opinii`;
};

/** Ten sam kubełek z dopiskiem źródła — używać wszędzie, gdzie liczba pochodzi z Google. */
export const formatReviewCountGoogle = (count?: number | null): string | null => {
  const bucket = formatReviewCount(count);
  return bucket === null ? null : `${bucket} Google`;
};

/** Tekst do pokazania zamiast liczby, gdy opinii nie ma wcale. */
export const NO_REVIEWS_LABEL = "brak opinii";
