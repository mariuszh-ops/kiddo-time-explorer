// JEDNO źródło prawdy dla zapytania listingu: budowa zapytania PostgREST,
// klucz filtrów i skrzynka na wynik zapytania wystartowanego WCZEŚNIE.
//
// A1000-P / bloker 2 (zmierzone 10.09.2026 na produkcji, CPU4x+4G, /malopolskie):
// zapytanie o pierwszą stronę listingu szło z efektu w komponencie liścia, więc
// ruszało dopiero po całym łańcuchu: montaż Reacta 1895 ms → leniwy chunk
// RegionRouteResolver → leniwy chunk CategoryPage 2193 ms → ewaluacja i pierwszy
// render (long task 844 ms) → fetch REST 3354 ms. Między końcem pobierania JS
// (2132 ms) a startem REST (3334 ms) stało 1202 ms, w których sieć nic nie robi.
//
// Dlatego `earlyListingStart.ts` (importowany JAKO PIERWSZY w `main.tsx`) składa
// DOKŁADNIE to samo zapytanie z adresu URL i wysyła je, zanim zewaluuje się graf
// Reacta; `useActivitiesInfinite` odbiera stąd gotowy wynik zamiast wysyłać drugi.
// Żeby te dwie drogi nie mogły się rozjechać, obie budują zapytanie i klucz
// filtrów TĄ SAMĄ funkcją — nie kopiuj tej logiki z powrotem do hooka.
import { catalogClient, CARD_COLUMNS, ageRangeOrFilter } from "@/lib/catalogClient";
import { sanitizeSearchTerm } from "@/lib/searchConfig";
import { REGION_SLUGS } from "@/data/regions";
import { getCategoryConfig } from "@/data/categoryPages";
import type { UseActivitiesFilters } from "@/hooks/useActivities";

export type ListingFilters = Omit<UseActivitiesFilters, "page" | "pageSize">;

/** Domyślne sortowanie listingu (najpopularniejsze). */
export const DEFAULT_LISTING_SORT = "reviews" as const;

/** Rozmiar strony listingu — ta sama liczba w hooku i we wczesnym starcie. */
export const LISTING_PAGE_SIZE = 24;

/**
 * Parametry URL, które ZAWĘŻAJĄ zbiór wyników (a więc zmieniają klucz filtrów).
 * Ta sama lista rządzi regułą „filtry → noindex" w CategoryPage (O-F-06), więc
 * mieszka w jednym miejscu. `page` nie jest filtrem — jest osobno tam, gdzie
 * trzeba, bo paginacja ma zostać indeksowalna.
 */
export const LISTING_FILTER_PARAMS = [
  "type",
  "amenities",
  "age",
  "free",
  "min",
  "sort",
  "search",
  "auto",
] as const;

/** Klucz tożsamości zapytania — zmiana klucza resetuje listę w hooku. */
export function listingFilterKey(filters: ListingFilters): string {
  const {
    region,
    type,
    amenities,
    minRating,
    sort = DEFAULT_LISTING_SORT,
    includeUncertain = true,
    ageMin,
    ageMax,
    onlyFree,
    search,
  } = filters;
  return JSON.stringify({
    region,
    type,
    amenitiesKey: amenities?.join(",") ?? "",
    minRating,
    sort,
    includeUncertain,
    ageMin,
    ageMax,
    onlyFree,
    searchTerm: sanitizeSearchTerm(search ?? ""),
  });
}

/**
 * Zapytanie do `public_activities` dla listingu.
 * `headOnly` — sam licznik (count exact, head), bez wierszy;
 * `withCount` — wiersze RAZEM z licznikiem (pierwsza strona po zmianie filtrów).
 */
export function buildListingQuery(
  filters: ListingFilters,
  { headOnly = false, withCount = false }: { headOnly?: boolean; withCount?: boolean } = {},
) {
  const {
    region,
    type,
    amenities,
    minRating,
    sort = DEFAULT_LISTING_SORT,
    includeUncertain = true,
    ageMin,
    ageMax,
    onlyFree,
    search,
  } = filters;
  const searchTerm = sanitizeSearchTerm(search ?? "");

  let q = catalogClient
    .from("public_activities")
    .select(
      headOnly ? "place_id" : CARD_COLUMNS,
      headOnly ? { count: "exact", head: true } : withCount ? { count: "exact" } : {},
    )
    .eq("published", true);
  if (region) q = q.eq("region", region);
  if (type) q = q.eq("type", type);
  if (amenities && amenities.length > 0) q = q.contains("amenities", JSON.stringify(amenities));
  if (typeof minRating === "number" && minRating > 0) q = q.gte("rating", minRating);
  if (!includeUncertain) q = q.eq("uncertain", false);
  if (onlyFree) q = q.eq("is_free", true);
  if (searchTerm.length >= 2) {
    q = q.or(`name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`);
  }
  // Zakres wieku [ageMin, ageMax] — przecinanie przedziałów. Rekordy z
  // age_min/age_max=null są WYŁĄCZONE z filtra (przechodzą zawsze) — M-07.
  if (typeof ageMin === "number" && typeof ageMax === "number") {
    q = q.or(ageRangeOrFilter(ageMin, ageMax));
  }
  if (sort === "name") q = q.order("name", { ascending: true });
  else if (sort === "reviews")
    q = q
      .order("reviews_count", { ascending: false, nullsFirst: false })
      .order("rating", { ascending: false, nullsFirst: false });
  else
    q = q
      .order("rating", { ascending: false, nullsFirst: false })
      .order("reviews_count", { ascending: false, nullsFirst: false });
  return q;
}

/**
 * Filtry listingu wyczytane z adresu — albo `null`, gdy tego adresu NIE wolno
 * wystartować wcześniej. Świadomie wąsko: tylko wejście „czyste", czyli trasa
 * listingu bez ani jednego parametru zawężającego i bez `?page=`. Każdy inny
 * adres (filtr, fraza, strona N, nieznany slug) idzie starą drogą — wczesny
 * start ma nic nie zmieniać, a nie zgadywać.
 */
export function listingFromUrl(pathname: string, search: string): ListingFilters | null {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return null;
  }
  if (params.has("page")) return null;
  if (LISTING_FILTER_PARAMS.some((key) => params.has(key))) return null;

  let segments: string[];
  try {
    segments = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  } catch {
    return null; // niepoprawny %-escape w ścieżce
  }

  let region: string | undefined;
  let category: string | undefined;
  if (segments.length === 1 && REGION_SLUGS.includes(segments[0])) {
    region = segments[0];
  } else if (segments.length === 2 && segments[0] === "kategoria") {
    category = segments[1];
  } else if (segments.length === 2 && REGION_SLUGS.includes(segments[0])) {
    region = segments[0];
    category = segments[1];
  } else if (segments.length === 3 && segments[0] === "atrakcje" && REGION_SLUGS.includes(segments[1])) {
    region = segments[1];
    category = segments[2];
  } else {
    return null;
  }
  // Nieznana kategoria kończy się w CategoryPage na 404 — nie pytaj o nią bazy.
  if (category && !getCategoryConfig(category)) return null;

  // Kształt MUSI być identyczny z tym, co CategoryPage podaje hookowi przy
  // wejściu bez parametrów — inaczej klucze się rozjadą i wynik nie zostanie odebrany.
  return {
    region,
    type: category,
    amenities: [],
    minRating: 0,
    sort: DEFAULT_LISTING_SORT,
    includeUncertain: true,
    ageMin: undefined,
    ageMax: undefined,
    onlyFree: false,
    search: "",
  };
}

type ListingResult = { data: unknown; count: number | null; error: unknown };

/** Skrzynka na jeden wynik: wypełnia ją wczesny start, opróżnia hook. */
let skrzynka: { key: string; page: number; czas: number; wynik: Promise<ListingResult> } | null = null;

/**
 * Wynik jest ważny tylko przez chwilę po starcie strony. Gdyby hook sięgnął po
 * niego minutę później (np. użytkownik wrócił na ten adres w ramach SPA),
 * dostałby dane sprzed minuty — wtedy lepiej zapytać jeszcze raz.
 */
const WAZNY_MS = 10_000;

export function stashEarlyListing(key: string, page: number, wynik: Promise<ListingResult>): void {
  skrzynka = { key, page, czas: Date.now(), wynik };
}

export function clearEarlyListing(): void {
  skrzynka = null;
}

/** Odbiera wynik dokładnie raz; `null`, gdy nie pasuje albo się zestarzał. */
export function takeEarlyListing(key: string, page: number): Promise<ListingResult> | null {
  if (!skrzynka) return null;
  if (skrzynka.key !== key || skrzynka.page !== page) return null;
  const swiezy = Date.now() - skrzynka.czas <= WAZNY_MS;
  const wynik = skrzynka.wynik;
  skrzynka = null;
  return swiezy ? wynik : null;
}
