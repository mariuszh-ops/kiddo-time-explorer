/**
 * Ocena w formacie polskim: przecinek dziesiętny, zawsze jedno miejsce po przecinku.
 * `toFixed(1)` dawało „4.9" obok „4,9" z bloku opinii na tym samym ekranie (audyt 325: I-10/J-06).
 */
export const formatRatingPl = (rating: number): string =>
  rating.toLocaleString("pl-PL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
