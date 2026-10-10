const OPCJE_OCENY = { minimumFractionDigits: 1, maximumFractionDigits: 1 } as const;
// AF-5-065: jeden formater na moduł. `toLocaleString` z opcjami buduje Intl.NumberFormat
// od nowa przy każdym wywołaniu, a ocena idzie przez to dwa razy na kartę (aria-label
// + tekst): 20-31 ms przy CPU 4x na liście 48 kart w profilu kliku opcji „Kategorii”.
const FORMAT_OCENY = new Intl.NumberFormat("pl-PL", OPCJE_OCENY);

/**
 * Ocena w formacie polskim: przecinek dziesiętny, zawsze jedno miejsce po przecinku.
 * `toFixed(1)` dawało „4.9" obok „4,9" z bloku opinii na tym samym ekranie (audyt 325: I-10/J-06).
 *
 * Wynik 1:1 z dawnym `rating.toLocaleString("pl-PL", …)` (formatyIntl.test.ts). Nie-liczba
 * (np. null z bazy mimo typu) idzie dawną drogą: null dalej rzuca TypeError, zamiast po
 * cichu dać „0,0” z Intl.format.
 */
export const formatRatingPl = (rating: number): string =>
  typeof rating === "number"
    ? FORMAT_OCENY.format(rating)
    : (rating as unknown as number).toLocaleString("pl-PL", OPCJE_OCENY);
