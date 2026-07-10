// Activity data module — reads the catalog directly from the external Supabase
// project (public_activities). Statyczny snapshot public/data/activities.json
// został usunięty; w razie awarii sieci używamy `fallbackActivities.ts`.
import { REGIONS } from "@/data/regions";

export interface Activity {
  id: number;
  title: string;
  location: string;
  city: string;
  rating: number;
  reviewCount: number;
  ageRange: string;
  ageMin: number;
  ageMax: number;
  matchPercentage: number;
  imageUrl: string;
  imageUrls?: string[];
  tags: string[];
  isIndoor: boolean;
  type: string;
  isEvent?: boolean;
  eventDate?: string;
  address?: string;
  openingHours?: string;
  estimatedTime?: string;
  priceRange?: string;
  experiencePoints?: string[];
  website?: string;
  reviews?: { author: string; rating: number; text: string; date?: string; source?: "google" }[];
  /** Zewnętrzny identyfikator atrakcji (klucz z public_activities.place_id). */
  place_id?: string;
  latitude: number;
  longitude: number;
  slug: string;
  amenities?: string[];
  priceLevel?: 0 | 1 | 2 | 3;
  priceNote?: string;
  isRecommended?: boolean;
  googlePlaceId?: string;
  google_rating?: number;
  google_review_count?: number;
  coordinates?: { lat: number; lng: number };
  description?: string;
  phone?: string;
  /** Automatyczna klasyfikacja AI (true) vs. reguły (false/undefined). */
  uncertain?: boolean;
  /** Poziom pewności AI: 'niska' | 'srednia' | 'wysoka' — tylko gdy uncertain=true. */
  confidence?: "niska" | "srednia" | "wysoka" | null;
  /** Czy wiek został potwierdzony w danych (age_min i age_max nie są nullem). */
  hasAgeInfo?: boolean;
}

export const PRICE_LEVELS = {
  0: { label: "Bezpłatne", badge: "Bezpłatne", color: "text-green-800 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-950/30 dark:border-green-800" },
  1: { label: "Niedrogie", badge: "$", color: "text-blue-800 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/30 dark:border-blue-800" },
  2: { label: "Umiarkowane", badge: "$$", color: "text-amber-800 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-800" },
  3: { label: "Drogie", badge: "$$$", color: "text-red-800 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/30 dark:border-red-800" },
} as const;

// --- Async data loading ---

export type DataStatus = "loading" | "success" | "error";

let _activities: Activity[] = [];
let _loaded = false;
let _status: DataStatus = "loading";
const _statusListeners = new Set<() => void>();

function _setStatus(status: DataStatus) {
  if (_status === status) return;
  _status = status;
  _statusListeners.forEach((listener) => listener());
}

/** Current load status of the activity catalog. */
export function getDataStatus(): DataStatus {
  return _status;
}

/** Subscribe to status changes (useSyncExternalStore-compatible). Returns unsubscribe. */
export function subscribeDataStatus(listener: () => void): () => void {
  _statusListeners.add(listener);
  return () => {
    _statusListeners.delete(listener);
  };
}

export async function loadActivities(): Promise<Activity[]> {
  if (_loaded) return _activities;
  try {
    // Katalog atrakcji leży w OSOBNYM (zewnętrznym) projekcie Supabase.
    // Czytamy anonimowo z tabeli `public_activities` (RLS: anon SELECT).
    const { catalogClient, mapCatalogRow } = await import("@/lib/catalogClient");
    type CatalogRow = import("@/lib/catalogClient").CatalogRow;
    const PAGE = 1000;
    const all: CatalogRow[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await catalogClient
        .from("public_activities")
        .select("*")
        .eq("published", true)
        .order("rating", { ascending: false })
        .order("reviews_count", { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      all.push(...(data as CatalogRow[]));
      if (data.length < PAGE) break;
    }
    _activities = all.map((row, i) => mapCatalogRow(row, i));
    _loaded = true;
    _invalidateLookups();
    _setStatus("success");
    return _activities;
  } catch (err) {
    console.error("[ActivitiesLoader] Failed to load catalog from Supabase:", err);
    // Awaryjny statyczny snapshot — ładowany dynamicznie, żeby nie obciążał main chunku.
    try {
      const { fallbackActivities } = await import("./fallbackActivities");
      _activities = fallbackActivities;
      _invalidateLookups();
    } catch { /* brak fallbacku — zostają puste dane */ }
    _setStatus("error");
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/** Synchronous getter — returns loaded activities (empty array before load) */
export function getActivities(): Activity[] {
  return _activities;
}

/** Override activities in memory (e.g. from admin import) */
export function setActivities(data: Activity[]) {
  _activities = data;
  _loaded = true;
  _invalidateLookups();
  _setStatus("success");
}

// Backward compatibility — same reference as getActivities()
// Components should migrate to getActivities() over time
export { _activities as mockActivities };

// --- Lookup maps: id ↔ slug ↔ activity ---
// Built lazily and cached. Cache is invalidated whenever the dataset changes
// (loadActivities / setActivities). Routing nadal działa po `id` — te mapy
// służą tylko jako wygodny most między id i slug.

let _slugById: Map<number, string> | null = null;
let _idBySlug: Map<string, number> | null = null;
let _activityBySlug: Map<string, Activity> | null = null;
let _activityById: Map<number, Activity> | null = null;

function _invalidateLookups() {
  _slugById = null;
  _idBySlug = null;
  _activityBySlug = null;
  _activityById = null;
}

function _buildLookups() {
  _slugById = new Map();
  _idBySlug = new Map();
  _activityBySlug = new Map();
  _activityById = new Map();
  for (const a of _activities) {
    _slugById.set(a.id, a.slug);
    _activityById.set(a.id, a);
    if (a.slug) {
      _idBySlug.set(a.slug, a.id);
      _activityBySlug.set(a.slug, a);
    }
  }
}

/** Map: activity id → slug (rebuilt when data changes). */
export function getSlugById(): ReadonlyMap<number, string> {
  if (!_slugById) _buildLookups();
  return _slugById!;
}

/** Map: slug → activity id. */
export function getIdBySlug(): ReadonlyMap<string, number> {
  if (!_idBySlug) _buildLookups();
  return _idBySlug!;
}

/** Lookup by id (O(1)). */
export function getActivityById(id: number): Activity | undefined {
  if (!_activityById) _buildLookups();
  return _activityById!.get(id);
}

/** Lookup by slug (O(1)). */
export function getActivityBySlug(slug: string): Activity | undefined {
  if (!_activityBySlug) _buildLookups();
  return _activityBySlug!.get(slug);
}

/** Convenience helpers — return undefined if the source key is unknown. */
export function slugFromId(id: number): string | undefined {
  return getSlugById().get(id);
}

export function idFromSlug(slug: string): number | undefined {
  return getIdBySlug().get(slug);
}

// Filter options with counts
export const filterOptions = {
  // Slugi 16 województw z src/data/regions.ts
  city: REGIONS.map((r) => ({ value: r.slug, label: r.label })),
  age: [
    { value: "0-2", label: "0–2 lata", min: 0, max: 2 },
    { value: "3-5", label: "3–5 lat", min: 3, max: 5 },
    { value: "6-9", label: "6–9 lat", min: 6, max: 9 },
    { value: "10-13", label: "10–13 lat", min: 10, max: 13 },
    { value: "14-16", label: "14–16 lat", min: 14, max: 16 },
  ],
  type: [
    { value: "sala-zabaw", label: "Sale zabaw" },
    { value: "plac-zabaw", label: "Place zabaw" },
    { value: "park-rozrywki", label: "Parki rozrywki" },
    { value: "centra-rozrywki", label: "Centra rozrywki" },
    { value: "muzeum-teatr", label: "Muzea i teatry" },
    { value: "sport", label: "Sport i ruch" },
    { value: "zoo", label: "Zoo i zwierzęta" },
    { value: "park", label: "Parki i natura" },
    { value: "inne", label: "Inne" },
  ],
  indoor: [
    { value: "indoor", label: "Pod dachem" },
    { value: "outdoor", label: "Na zewnątrz" },
  ],
  activityKind: [
    { value: "place", label: "Miejsca" },
    { value: "event", label: "Wydarzenia" },
  ],
  distance: [
    { value: "center", label: "Centrum miasta" },
    { value: "25km", label: "Do 25 km" },
    { value: "50km", label: "Do 50 km" },
    { value: "100km", label: "Do 100 km" },
  ],
  price: [
    { value: "free", label: "Bezpłatne" },
    { value: "paid", label: "Płatne" },
  ],
};

// Współrzędne stolic województw — używane w filtrze dystansu i sortowaniu.
export const cityCenters: Record<string, { lat: number; lng: number }> =
  REGIONS.reduce(
    (acc, r) => ({ ...acc, [r.slug]: r.center }),
    {} as Record<string, { lat: number; lng: number }>,
  );
