// Normalizacja frazy wyszukiwania — BEZ zależności od danych aplikacji.
//
// Osobny moduł, bo `listingQuery.ts` (a przez niego wczesny start listingu,
// importowany jako PIERWSZY w `main.tsx`) potrzebuje tylko tych dwóch funkcji,
// a `searchMatch.ts` ciągnie `@/data/activities` i etykiety województw.
//
// Odpowiednik po stronie bazy: `public.ff_norm()` (migracja FMN-B93
// `20261010150000_fmn_b93_ff_norm_wszystkie_akcenty.sql`). Obie strony mają dawać
// to samo dla liter łacińskich: małe litery, bez akcentów, `ł` → `l`. Zgodność
// pilnuje `src/lib/__tests__/ffNormZgodnosc.test.ts` (czyta mapę z migracji).

/** Małe litery + usunięcie akcentów (NFD bez znaków łączących) + `ł` → `l`. */
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l");
}

/**
 * Granica słów: białe znaki ORAZ interpunkcja Unicode (`\p{P}`: , . ; : ! ? ( ) " „ ” ' / & % _ …)
 * — z wyjątkiem łącznika `-` (U+002D), który zostaje w słowie („Bielsko-Biała”,
 * „Rabka-Zdrój” mają go też w danych). Symbole spoza `\p{P}` (emoji, `+`) bez zmian.
 *
 * AN-4-029: przy cięciu tylko po spacjach „zoo.” i „Kraków, zoo” dawały 0 wyników,
 * bo `ff_home_match` szuka każdego słowa jako podciągu (LIKE '%zoo.%').
 */
const GRANICA_SLOWA = /(?:\s|(?!-)\p{P})+/u;

/** Rozbija zapytanie na tokeny (po białych znakach i interpunkcji) i normalizuje każdy z nich. */
export function tokenizeQuery(query: string): string[] {
  return normalizeSearchText(query)
    .split(GRANICA_SLOWA)
    .map((t) => t.trim())
    .filter(Boolean);
}
