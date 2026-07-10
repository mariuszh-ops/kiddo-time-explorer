// Dedykowany, tylko-do-odczytu klient Supabase dla ZEWNĘTRZNEGO projektu z
// katalogiem atrakcji (public_activities, RLS: anonimowy SELECT).
// Osobny od `@/integrations/supabase/client`, który obsługuje Lovable Cloud
// (m.in. tabelę saved_activities). Klucz anon jest publiczny — może żyć w
// kodzie frontu.
import { createClient } from "@supabase/supabase-js";

const CATALOG_URL = "https://zpqpgatnnbojgiejmtpt.supabase.co";
const CATALOG_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwcXBnYXRubmJvamdpZWptdHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MTY2OTIsImV4cCI6MjA5MzE5MjY5Mn0.nHm-KdlT1r2VlXQRfXqRDCCisU4KEf9yPI96kIpx4tc";

export const catalogClient = createClient(CATALOG_URL, CATALOG_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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
    location: row.city ?? row.region ?? "",
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
    address: row.address ?? undefined,
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