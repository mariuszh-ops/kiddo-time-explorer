/**
 * FMN-B52: linki, którymi strona województwa / kategorii zdejmuje JEDEN filtr
 * („Usuń filtr województwa”, „Usuń filtr kategorii”, „Szukaj w całej Polsce”).
 *
 * Wcześniej każdy z nich niósł samą frazę (`?search=`), więc rodzic, który chciał
 * poszerzyć tylko obszar, tracił też wiek i kategorię. Teraz link bierze bieżące
 * filtry minus to, co obiecuje zdjąć.
 *
 * Dwa słowniki adresu (spec FMN, sekcja 1):
 * - strona regionu/kategorii (CategoryPage): type, age, sort (rating|reviews|name),
 *   min, free, amenities, auto, search,
 * - strona główna „/” (useActivityFilters): region, age, type, sort
 *   (rating|most_reviewed|name|…), search.
 * Przy przejściu na „/” sort tłumaczymy jawną mapą, a czego „/” nie zna (min, free,
 * amenities, auto) nie wysyłamy. Parametry widoku mapy (view/lat/lng/zoom/cats)
 * i `page` nie przechodzą: kadr i strona listy należą do starej strony.
 *
 * FMN-B54 (R2 = A): okruszek „Strona główna” (`homeTo`) prowadzi na „/” z
 * województwem, wiekiem i kategorią tej strony — wcześniej był gołym „/”.
 */

export type RegionPageSort = "rating" | "reviews" | "name";

/** Filtry strony regionu/kategorii, już zwalidowane przez CategoryPage. */
export interface RegionPageFilters {
  age?: string;
  /** `?type=` — tylko gdy kategorii nie ma w ścieżce. */
  type?: string;
  /** Sort jawnie zapisany w adresie (bez domyślnego). */
  sort?: RegionPageSort;
  minRating?: number;
  onlyFree?: boolean;
  amenities?: string[];
  /** `?auto=0` — ukryte atrakcje klasyfikowane automatycznie. */
  hideUncertain?: boolean;
  search?: string;
}

export interface RegionExitLinks {
  removeRegionTo: string;
  removeCategoryTo: string;
  wholePolandTo: string;
  /** Okruszek „Strona główna”: „/” z województwem, wiekiem i kategorią (FMN-B54). */
  homeTo: string;
}

/** Sort strony regionu -> sort strony głównej. `reviews` na „/” nazywa się `most_reviewed`. */
export const SORT_NA_GLOWNA: Record<RegionPageSort, string> = {
  rating: "rating",
  reviews: "most_reviewed",
  name: "name",
};

/** Ścieżka + niepuste parametry w podanej kolejności (bez pustego „?”). FMN-B54 używa tego samego. */
export function zParametrami(sciezka: string, pary: Array<[string, string | undefined]>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of pary) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `${sciezka}?${s}` : sciezka;
}

/** Adres strony regionu/kategorii: ten sam słownik, bez `type` (kategoria siedzi w ścieżce albo jest zdejmowana). */
function adresStronyRegionu(sciezka: string, f: RegionPageFilters): string {
  return zParametrami(sciezka, [
    ["age", f.age],
    ["sort", f.sort],
    ["min", f.minRating && f.minRating > 0 ? String(f.minRating) : undefined],
    ["free", f.onlyFree ? "1" : undefined],
    ["amenities", f.amenities && f.amenities.length ? f.amenities.join(",") : undefined],
    ["auto", f.hideUncertain ? "0" : undefined],
    ["search", f.search],
  ]);
}

/** Adres strony głównej: tylko to, co „/” zna. */
function adresStronyGlownej(f: RegionPageFilters, type: string | undefined): string {
  return zParametrami("/", [
    ["age", f.age],
    ["type", type],
    ["sort", f.sort ? SORT_NA_GLOWNA[f.sort] : undefined],
    ["search", f.search],
  ]);
}

export function regionExitLinks(
  citySlug: string | undefined,
  categorySlug: string | undefined,
  filters: RegionPageFilters,
): RegionExitLinks {
  // Zdjęcie województwa: /<woj>/<kat> -> /kategoria/<kat> (ten sam słownik),
  // /<woj> -> „/” z kategorią z ?type=.
  const removeRegionTo = categorySlug
    ? adresStronyRegionu(`/kategoria/${categorySlug}`, filters)
    : adresStronyGlownej(filters, filters.type);
  // Zdjęcie kategorii: /<woj>/<kat> -> /<woj>; /kategoria/<kat> -> „/” bez kategorii.
  const removeCategoryTo = citySlug
    ? adresStronyRegionu(`/${citySlug}`, filters)
    : adresStronyGlownej(filters, undefined);
  // „Szukaj w całej Polsce” = zdjęcie województwa. Na /kategoria/<kat> (już cała
  // Polska) link jak dotąd prowadzi na „/” bez kategorii, ale z wiekiem i sortem.
  const wholePolandTo = citySlug ? removeRegionTo : adresStronyGlownej(filters, undefined);
  // „Strona główna” to ten sam wybór rodzica na „/”: województwo, wiek, kategoria
  // (ze ścieżki albo z ?type=). Sort, fraza i filtry, których „/” nie zna, nie przechodzą.
  const homeTo = zParametrami("/", [
    ["region", citySlug],
    ["age", filters.age],
    ["type", categorySlug ?? filters.type],
  ]);
  return { removeRegionTo, removeCategoryTo, wholePolandTo, homeTo };
}
