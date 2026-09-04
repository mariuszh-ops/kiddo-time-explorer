// Piny mapy w JEDNYM zapytaniu: RPC public.get_map_pins() zwraca atrakcje
// jako tablicę tablic — bez stronicowania (zero odpowiedzi 206) i bez ciężkich
// pól. Pełne dane (zdjęcie, miejscowość, udogodnienia, opis) dociągamy dopiero
// na żądanie: po kliknięciu w pin / dla widocznych kafli.
//
// F-17: RPC przyjmuje kadr (min_lat/max_lat/min_lng/max_lng) i województwo
// (region_slug). Każdy parametr ma w bazie default NULL = brak warunku, więc
// wywołanie bez argumentów nadal zwraca komplet katalogu. Bez zawężenia było to
// 4892 piny / 924 KiB na KAŻDE otwarcie mapy, niezależnie od kadru i regionu.
import { catalogClient, mapCatalogRow, ageRangeOrFilter, type CatalogRow } from "@/lib/catalogClient";
import { displayLocation } from "@/lib/address";
import type { Activity } from "@/data/activities";

/**
 * Kolejność pól w json_build_array w definicji public.get_map_pins():
 * 0 place_id, 1 slug, 2 name, 3 type, 4 lat, 5 lng, 6 rating,
 * 7 reviews_count, 8 age_min, 9 age_max, 10 is_free, 11 region, 12 city
 *
 * Slot 0 (place_id) od F-17 przychodzi jako NULL — piny go nie używają
 * (`mapCatalogRow` liczy `id` z sluga), a kosztował ~30 B na pin. Slot został
 * na miejscu, żeby zmiana w bazie nie przesunęła indeksów wdrożonemu frontowi.
 */
export type MapPinTuple = [
  string | null,
  string,
  string,
  string,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  boolean | null,
  string | null,
  string | null,
];

export function pinTupleToActivity(t: MapPinTuple): Activity {
  const row: CatalogRow = {
    // Slot 0 to od F-17 zawsze NULL — patrz komentarz przy MapPinTuple.
    place_id: t[0] ?? "",
    slug: t[1],
    name: t[2],
    type: t[3],
    region: t[11] ?? null,
    city: t[12] ?? null,
    address: null,
    lat: t[4],
    lng: t[5],
    rating: t[6],
    reviews_count: t[7],
    description: null,
    price_note: null,
    phone: null,
    website: null,
    opening_hours: null,
    amenities: null,
    image_url: null,
    good_for_children: null,
    published: true,
    age_min: t[8],
    age_max: t[9],
    is_free: t[10],
  };
  return mapCatalogRow(row);
}


/** Kadr mapy w stopniach — granice przekazywane do RPC. */
export interface MapBbox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** Zawężenie zapytania o piny. Puste = cały katalog (jak przed F-17). */
export interface MapPinsQuery {
  /** Slug województwa (`region` w public_activities). */
  region?: string | null;
  /** Kadr POBIERANIA (z zapasem); piny spoza niego nie opuszczają bazy. */
  bbox?: MapBbox | null;
  /**
   * Kadr faktycznie WIDOCZNY, bez zapasu. Służy wyłącznie do sprawdzenia
   * „czy mam już wszystko, co widać" — gdyby porównywać kadry pobierania,
   * każde przesunięcie mapy o piksel wypadałoby poza poprzedni kadr i słało
   * zapytanie, mimo że zapas dawno pokrył ten obszar.
   */
  visible?: MapBbox | null;
}

/** Klucz cache — kadr zaokrąglony do 4 miejsc (~11 m), żeby drobny pan trafiał w cache. */
export function mapPinsKey(query?: MapPinsQuery): string {
  const b = query?.bbox;
  const kadr = b
    ? `${b.minLat.toFixed(4)},${b.maxLat.toFixed(4)},${b.minLng.toFixed(4)},${b.maxLng.toFixed(4)}`
    : "*";
  return `${query?.region ?? "*"}|${kadr}`;
}

/** `true`, gdy `outer` w całości zawiera `inner` (kadr już pobrany → bez zapytania). */
export function bboxContains(outer: MapBbox, inner: MapBbox): boolean {
  return (
    outer.minLat <= inner.minLat &&
    outer.maxLat >= inner.maxLat &&
    outer.minLng <= inner.minLng &&
    outer.maxLng >= inner.maxLng
  );
}

// Cache per zapytanie. Kadrów w jednej sesji może być dużo (każde oddalenie to
// nowy klucz), więc trzymamy ograniczoną liczbę wpisów w kolejności wstawiania.
const CACHE_LIMIT = 32;
const pinsCache = new Map<string, Activity[]>();
const pinsInflight = new Map<string, Promise<Activity[]>>();

/** Jedno wywołanie rpc('get_map_pins') na zapytanie (wynik trzymany w pamięci). */
export function fetchMapPins(query?: MapPinsQuery): Promise<Activity[]> {
  const key = mapPinsKey(query);
  const zCache = pinsCache.get(key);
  if (zCache) return Promise.resolve(zCache);
  const wLocie = pinsInflight.get(key);
  if (wLocie) return wLocie;

  const params: Record<string, string | number> = {};
  if (query?.region) params.region_slug = query.region;
  if (query?.bbox) {
    params.min_lat = query.bbox.minLat;
    params.max_lat = query.bbox.maxLat;
    params.min_lng = query.bbox.minLng;
    params.max_lng = query.bbox.maxLng;
  }

  const promise = (async () => {
    const { data, error } = await catalogClient.rpc("get_map_pins", params);
    if (error) throw error;
    const tuples = (data as unknown as MapPinTuple[] | null) ?? [];
    const pins = tuples
      .filter((t) => Array.isArray(t) && t[4] != null && t[5] != null)
      .map(pinTupleToActivity);
    if (pinsCache.size >= CACHE_LIMIT) {
      const najstarszy = pinsCache.keys().next();
      if (!najstarszy.done) pinsCache.delete(najstarszy.value);
    }
    pinsCache.set(key, pins);
    return pins;
  })().finally(() => {
    pinsInflight.delete(key);
  });
  pinsInflight.set(key, promise);
  return promise;
}

/** Alias czytelniejszy w widokach listingowych (ten sam cache). */
export const getMapPins = fetchMapPins;


export interface PinDetails {
  imageUrl?: string;
  location?: string;
  city?: string;
  amenities?: string[];
}

const detailsCache = new Map<string, PinDetails>();
// Slugi, dla których zapytanie już leci — bez tego przesuwanie mapy odpalało
// kilka równoległych paczek o (w dużej części) te same wiersze.
const detailsPending = new Set<string>();

export function getCachedPinDetails(slug: string): PinDetails | undefined {
  return detailsCache.get(slug);
}

/**
 * Dociągnięcie „ładnych" pól dla konkretnych slugów (zdjęcie, miejscowość,
 * województwo, udogodnienia). Jedno zapytanie na paczkę, bez stronicowania.
 */
export async function fetchPinDetails(slugs: string[]): Promise<Map<string, PinDetails>> {
  const missing = slugs.filter((s) => s && !detailsCache.has(s) && !detailsPending.has(s));
  if (missing.length > 0) {
    missing.forEach((s) => detailsPending.add(s));
    try {
    const { data, error } = await catalogClient
      .from("public_activities")
      .select("slug,image_url,city,region,amenities")
      .in("slug", missing.slice(0, 100));
    if (error) throw error;
    type DetailRow = {
      slug: string;
      image_url: string | null;
      city: string | null;
      region: string | null;
      amenities: string[] | null;
    };
    for (const row of (data as unknown as DetailRow[] | null) ?? []) {
      detailsCache.set(row.slug, {
        imageUrl: row.image_url ?? undefined,
        location: displayLocation(row.city, row.region),
        city: row.region ?? row.city ?? undefined,
        amenities: row.amenities ?? undefined,
      });
    }
    // Slugi bez wiersza oznaczamy jako „sprawdzone", żeby nie pytać w kółko.
    for (const s of missing) if (!detailsCache.has(s)) detailsCache.set(s, {});
    } finally {
      missing.forEach((s) => detailsPending.delete(s));
    }
  }
  const out = new Map<string, PinDetails>();
  for (const s of slugs) {
    const d = detailsCache.get(s);
    if (d) out.set(s, d);
  }
  return out;
}

/** Scal pin z dociągniętymi szczegółami (jeśli są w cache). */
export function mergePinDetails(activity: Activity): Activity {
  const d = detailsCache.get(activity.slug);
  if (!d || (!d.imageUrl && !d.location)) return activity;
  return {
    ...activity,
    imageUrl: d.imageUrl ?? activity.imageUrl,
    imageUrls: d.imageUrl ? [d.imageUrl] : activity.imageUrls,
    location: d.location || activity.location,
    city: d.city ?? activity.city,
    amenities: d.amenities ?? activity.amenities,
  };
}


export interface MapSlugFilters {
  region?: string;
  type?: string;
  amenities?: string[];
  minRating?: number;
  includeUncertain?: boolean;
  onlyFree?: boolean;
  ageMin?: number;
  ageMax?: number;
  search?: string;
}

/**
 * Zbiór slugów spełniających KOMPLET filtrów listingu — używany tylko wtedy,
 * gdy aktywny jest filtr, którego nie ma w tuplach get_map_pins
 * (min / auto=0 / amenities). Jedno lekkie zapytanie (same slugi), stronicowane
 * paczkami po 1000, bo PostgREST zwraca maksymalnie tyle wierszy naraz.
 */
export async function fetchFilteredSlugs(f: MapSlugFilters): Promise<Set<string>> {
  const CHUNK = 1000;
  const out = new Set<string>();
  for (let page = 0; page < 20; page++) {
    let q = catalogClient
      .from("public_activities")
      .select("slug")
      .eq("published", true);
    if (f.region) q = q.eq("region", f.region);
    if (f.type) q = q.eq("type", f.type);
    if (f.amenities && f.amenities.length > 0)
      q = q.contains("amenities", JSON.stringify(f.amenities));
    if (typeof f.minRating === "number" && f.minRating > 0) q = q.gte("rating", f.minRating);
    if (f.includeUncertain === false) q = q.eq("uncertain", false);
    if (f.onlyFree) q = q.eq("is_free", true);
    const term = (f.search ?? "").trim();
    if (term.length >= 2) q = q.or(`name.ilike.%${term}%,city.ilike.%${term}%`);
    // Rekordy z age_min/age_max=null są WYŁĄCZONE z filtra wieku (M-07).
    if (typeof f.ageMin === "number" && typeof f.ageMax === "number")
      q = q.or(ageRangeOrFilter(f.ageMin, f.ageMax));
    q = q.order("slug", { ascending: true }).range(page * CHUNK, page * CHUNK + CHUNK - 1);

    const { data, error } = await q;
    if (error) throw error;
    const rows = (data as unknown as { slug: string }[] | null) ?? [];
    for (const r of rows) if (r.slug) out.add(r.slug);
    if (rows.length < CHUNK) break;
  }
  return out;
}
