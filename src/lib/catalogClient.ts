// JEDYNY klient Supabase w aplikacji — projekt katalogowy
// (public_activities, user_reviews, issue_reports, saved_activities, admins,
// rpc('is_admin'), rpc('admin_stats')). Autoryzacja i wszystkie zapytania
// przechodzą przez ten sam klient, dzięki czemu nagłówek Authorization: Bearer
// niesie token zalogowanego użytkownika (role:"authenticated").
// Klucz anon jest publiczny — może żyć w kodzie frontu.
import { createClient } from "@supabase/supabase-js";
import { displayLocation, formatAddress } from "@/lib/address";
import { reportInvalidSession } from "@/lib/sessionRecovery";

const CATALOG_URL = "https://zpqpgatnnbojgiejmtpt.supabase.co";
const CATALOG_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwcXBnYXRubmJvamdpZWptdHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MTY2OTIsImV4cCI6MjA5MzE5MjY5Mn0.nHm-KdlT1r2VlXQRfXqRDCCisU4KEf9yPI96kIpx4tc";

export const CATALOG_AUTH_STORAGE_KEY = "sb-catalog-auth";

/**
 * I-01: wspólny komputer. `signOut()` sam kasuje klucze sesji, ale gdy żądanie
 * wylogowania padnie albo wyścignie się z odświeżaniem tokenu, klucz może
 * przeżyć — a wtedy kolejna osoba przy tej przeglądarce widzi cudze konto.
 * Kasujemy więc jawnie WSZYSTKIE klucze GoTrue tego klienta
 * (`sb-catalog-auth`, `-user`, `-code-verifier`, `-flows-code-verifier`).
 */
export function clearCatalogAuthStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const doKasacji: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(CATALOG_AUTH_STORAGE_KEY)) doKasacji.push(key);
    }
    doKasacji.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // brak storage — nic do sprzątania
  }
}

const urlOf = (input: RequestInfo | URL): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
};

const headersOf = (input: RequestInfo | URL, init?: RequestInit): Headers => {
  const headers = new Headers(
    typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined
  );
  if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
  return headers;
};

const withAnonAuth = (headers: Headers): Headers => {
  headers.set("apikey", CATALOG_ANON_KEY);
  headers.set("Authorization", `Bearer ${CATALOG_ANON_KEY}`);
  return headers;
};

/**
 * Fetch klienta katalogu:
 * - wszystkie zapytania przechodzą z bieżącym tokenem użytkownika;
 * - 401 / PGRST301 na zasobach → globalne zgłoszenie martwej sesji
 *   i ponowna próba jako anonim.
 */
const catalogFetch: typeof fetch = async (input, init) => {
  const url = urlOf(input);
  const isAuthEndpoint = url.includes("/auth/v1/");

  const response = await fetch(input, init);
  if (response.status !== 401 || isAuthEndpoint) return response;

  let code = "";
  try {
    code = (await response.clone().json())?.code ?? "";
  } catch {
    code = "";
  }
  if (code && code !== "PGRST301" && code !== "PGRST303") return response;

  reportInvalidSession();

  const headers = headersOf(input, init);
  const auth = headers.get("Authorization");
  if (auth && auth !== `Bearer ${CATALOG_ANON_KEY}`) {
    return fetch(new Request(url, { ...init, headers: withAnonAuth(headers) }));
  }
  return response;
};

export const catalogClient = createClient(CATALOG_URL, CATALOG_ANON_KEY, {
  global: { fetch: catalogFetch },
  auth: {
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    storageKey: CATALOG_AUTH_STORAGE_KEY,
  },
});

// Alias — zachęcamy do używania nazwy `supabase` w nowym kodzie.
export const supabase = catalogClient;

// Lekka lista kolumn dla widoków listowych (kafle + filtry + sortowanie +
// wyszukiwarka + dystans). Świadomie pomija ciężkie pola strony detalu:
// reviews, experience_points, description, price_note, phone, website,
// opening_hours, address, confidence, good_for_children.
export const CARD_COLUMNS =
  "place_id,slug,name,type,region,city,lat,lng,rating,reviews_count," +
  "age_min,age_max,is_free,amenities,image_url,uncertain";

// Lista kolumn dla tabeli katalogu w /admin — suma tego, co renderuje
// CatalogTable, i tego, co edytuje AdminCatalogDrawer (drawer dostaje wiersz
// z tabeli, nie dociąga go osobno). Świadomie pomija dwa ciężkie jsonb-y:
// `reviews` (7,2 MB w tabeli, 73 kB na stronę 50 wierszy) i
// `experience_points` — admin ich nie pokazuje ani nie edytuje.
// M-16: `select("*")` na tej stronie kosztował 157 kB i ~290 ms; ta lista 69 kB.
export const ADMIN_COLUMNS =
  "place_id,slug,name,type,region,city,address,description,price_note," +
  "phone,website,opening_hours,image_url,lat,lng,amenities,rating," +
  "reviews_count,age_min,age_max,is_free,good_for_children,published," +
  "admin_hidden,featured,uncertain,locked_fields";

/**
 * N-14 (decyzja wlasciciela 04.09.2026): przelacznik "Wyrozniona (featured)"
 * jest UKRYTY w /admin — na start i przez jakis czas po starcie nic nie ma byc
 * wyroznione. Kolumna `featured` ZOSTAJE w bazie, w typach i w ADMIN_COLUMNS:
 * powrot ma byc zdjeciem ukrycia (ta flaga na true), nie migracja.
 * Wyzwalacz rewizji: pierwszy partner handlowy do promocji — wtedy takze
 * "Polecane miejsca" (DiscoverSections.tsx) i odznaka na kaflu (ActivityCard.tsx).
 */
export const FEATURED_UI_ENABLED: boolean = false;

/**
 * Warunek `or=` dla filtra wieku [ageMin, ageMax] w zapytaniach PostgREST.
 *
 * Przedzialy przepuszczamy, gdy sie przecinaja (age_min <= ageMax && age_max >= ageMin).
 * Rekordy BEZ wieku (oba pola null) sa z filtra WYLACZONE — przechodza zawsze.
 * Bez tego 8 kart z nieznanym wiekiem (m.in. Energylandia) znikalo przy KAZDYM
 * ustawieniu filtra, bo null nie spelnia ani `.lte`, ani `.gte` (M-07, 04.09.2026).
 * Swiadomie nie wpisujemy im 0–99 do bazy: null znaczy „nie wiemy”, a 0–99 to
 * twierdzenie, ktorego nie mamy z czego wyprowadzic.
 *
 * Uzycie: `q.or(ageRangeOrFilter(ageMin, ageMax))` — supabase-js sam doklada nawiasy.
 * Kilka wywolan `.or()` na jednym zapytaniu PostgREST ANDuje (sprawdzone na zywo
 * 04.09: szukajka „park” 635 -> 633 ze starym filtrem, 635 z nowym).
 */
export function ageRangeOrFilter(ageMin: number, ageMax: number): string {
  return `and(age_min.lte.${ageMax},age_max.gte.${ageMin}),and(age_min.is.null,age_max.is.null)`;
}

// Wiersz z tabeli public_activities (patrz PROMPT).
export interface CatalogRow {
  place_id: string;
  slug: string;
  name: string;
  type: string;
  region: string | null;
  city: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  reviews_count: number | null;
  description: string | null;
  price_note: string | null;
  phone: string | null;
  website: string | null;
  opening_hours: string | null;
  amenities: string[] | null;
  image_url: string | null;
  good_for_children: boolean | null;
  published: boolean | null;
  uncertain?: boolean | null;
  confidence?: "niska" | "srednia" | "wysoka" | null;
  reviews?: Array<{ author: string; rating: number; text: string; source?: "google" }> | null;
  age_min?: number | null;
  age_max?: number | null;
  is_free?: boolean | null;
  admin_hidden?: boolean | null;
  featured?: boolean | null;
  locked_fields?: string[] | null;
  updated_at?: string | null;
  experience_points?: string[] | null;
}

import type { Activity } from "@/data/activities";

/** Fallback dla braku image_url. */
export const FALLBACK_IMAGE = "/placeholder.svg";

/**
 * Sformatuj przedział wieku do etykiety UI.
 * - null w którejkolwiek z granic → "" (brak badge)
 * - age_max === 16 → "{age_min}+" (np. "12+")
 * - inaczej → "{min}–{max} lata|lat"
 */
export function formatAgeRange(min: number | null | undefined, max: number | null | undefined): string {
  if (min == null || max == null) return "";
  if (max === 16) return `${min}+`;
  const word = max >= 2 && max <= 4 ? "lata" : "lat";
  return `${min}–${max} ${word}`;
}

/** Zamień wiersz katalogu na kształt oczekiwany przez UI (Activity). */
export function mapCatalogRow(row: CatalogRow, index = 0): Activity {
  const rating = row.rating ?? 0;
  const reviewCount = row.reviews_count ?? 0;
  const ageMinRaw = row.age_min ?? null;
  const ageMaxRaw = row.age_max ?? null;
  return {
    // W UI id nadal bywa używane jako key/lookup — używamy stabilnego hasha
    // ze sluga, żeby dwa wywołania mapowały ten sam wiersz na to samo id.
    id: hashStringToInt(row.slug || row.place_id || String(index)),
    slug: row.slug,
    title: row.name,
    // location = miejscowość (miasto), city = slug województwa (nasz "region").
    // Gdy miasto jest puste, pokazujemy nazwę województwa („woj. podkarpackie”).
    location: displayLocation(row.city, row.region),
    city: row.region ?? row.city ?? "",
    rating,
    reviewCount,
    ageRange: formatAgeRange(ageMinRaw, ageMaxRaw),
    ageMin: ageMinRaw ?? 0,
    ageMax: ageMaxRaw ?? 18,
    hasAgeInfo: ageMinRaw != null && ageMaxRaw != null,
    matchPercentage: 0,
    imageUrl: row.image_url ?? FALLBACK_IMAGE,
    imageUrls: row.image_url ? [row.image_url] : [],
    tags: [],
    isIndoor: false,
    type: row.type,
    address: formatAddress(row.address, displayLocation(row.city, row.region)),
    openingHours: row.opening_hours ?? undefined,
    priceRange: row.price_note ?? undefined,
    website: row.website ?? undefined,
    latitude: row.lat ?? 0,
    longitude: row.lng ?? 0,
    amenities: row.amenities ?? [],
    description: row.description ?? undefined,
    phone: row.phone ?? undefined,
    priceNote: row.price_note ?? undefined,
    google_rating: rating,
    google_review_count: reviewCount,
    coordinates: row.lat != null && row.lng != null ? { lat: row.lat, lng: row.lng } : undefined,
    uncertain: row.uncertain ?? false,
    confidence: row.confidence ?? null,
    place_id: row.place_id,
    isFree: row.is_free === true,
    experiencePoints: Array.isArray(row.experience_points)
      ? row.experience_points.map((p) => (typeof p === "string" ? p.trim() : "")).filter((p) => p.length > 0)
      : undefined,
    reviews: Array.isArray(row.reviews)
      ? row.reviews.map((r) => ({
          author: r.author,
          rating: r.rating,
          text: r.text,
          source: (r.source ?? "google") as "google",
        }))
      : undefined,
  };
}

// Deterministyczny hash string → 32-bit unsigned int (do stabilnego id).
function hashStringToInt(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}