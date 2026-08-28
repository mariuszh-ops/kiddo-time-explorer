// Piny mapy w JEDNYM zapytaniu: RPC public.get_map_pins() zwraca komplet
// atrakcji (~4900) jako tablicę tablic — bez stronicowania (zero odpowiedzi 206)
// i bez ciężkich pól. Pełne dane (zdjęcie, miejscowość, udogodnienia, opis)
// dociągamy dopiero na żądanie: po kliknięciu w pin / dla widocznych kafli.
import { catalogClient, mapCatalogRow, type CatalogRow } from "@/lib/catalogClient";
import { displayLocation } from "@/lib/address";
import type { Activity } from "@/data/activities";

/**
 * Kolejność pól w json_build_array w definicji public.get_map_pins():
 * 0 place_id, 1 slug, 2 name, 3 type, 4 lat, 5 lng, 6 rating,
 * 7 reviews_count, 8 age_min, 9 age_max, 10 is_free, 11 region, 12 city
 */
export type MapPinTuple = [
  string,
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
    place_id: t[0],
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


let pinsCache: Activity[] | null = null;
let pinsInflight: Promise<Activity[]> | null = null;

/** Jedno wywołanie rpc('get_map_pins') na sesję (wynik trzymany w pamięci). */
export function fetchMapPins(): Promise<Activity[]> {
  if (pinsCache) return Promise.resolve(pinsCache);
  if (pinsInflight) return pinsInflight;
  pinsInflight = (async () => {
    const { data, error } = await catalogClient.rpc("get_map_pins");
    if (error) throw error;
    const tuples = (data as unknown as MapPinTuple[] | null) ?? [];
    const pins = tuples
      .filter((t) => Array.isArray(t) && t[4] != null && t[5] != null)
      .map(pinTupleToActivity);
    pinsCache = pins;
    return pins;
  })().finally(() => {
    pinsInflight = null;
  });
  return pinsInflight;
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
    if (typeof f.ageMin === "number" && typeof f.ageMax === "number")
      q = q.lte("age_min", f.ageMax).gte("age_max", f.ageMin);
    q = q.order("slug", { ascending: true }).range(page * CHUNK, page * CHUNK + CHUNK - 1);

    const { data, error } = await q;
    if (error) throw error;
    const rows = (data as unknown as { slug: string }[] | null) ?? [];
    for (const r of rows) if (r.slug) out.add(r.slug);
    if (rows.length < CHUNK) break;
  }
  return out;
}
