// Data helper for MCP tools. Runs inside the Supabase Edge Function (Deno),
// so it must NOT import project-side modules that touch the browser.
// Reads directly from the external catalog Supabase project (public_activities,
// RLS: anonimowy SELECT). Wcześniej pobierał /data/activities.json z
// familyfun.pl — plik został usunięty.

export interface Activity {
  id: number;
  title: string;
  slug: string;
  location: string;
  city: string;
  rating: number;
  reviewCount: number;
  ageRange: string;
  isIndoor: boolean;
  tags: string[];
  description?: string;
  address?: string;
  website?: string;
  latitude: number;
  longitude: number;
  openingHours?: string;
  priceRange?: string;
  priceLevel?: number;
  imageUrl?: string;
}

const CATALOG_URL = "https://zpqpgatnnbojgiejmtpt.supabase.co";
const CATALOG_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwcXBnYXRubmJvamdpZWptdHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MTY2OTIsImV4cCI6MjA5MzE5MjY5Mn0.nHm-KdlT1r2VlXQRfXqRDCCisU4KEf9yPI96kIpx4tc";
const SELECT =
  "slug,name,type,region,city,address,rating,reviews_count,description,price_note,website,opening_hours,image_url,lat,lng";

let cache: { at: number; data: Activity[] } | null = null;
const TTL_MS = 5 * 60 * 1000;

export async function fetchActivities(): Promise<Activity[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  const url = `${CATALOG_URL}/rest/v1/public_activities?select=${encodeURIComponent(SELECT)}&published=eq.true&order=rating.desc.nullslast&limit=2000`;
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      apikey: CATALOG_ANON_KEY,
      authorization: `Bearer ${CATALOG_ANON_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Failed to load activities: ${res.status}`);
  const rows = (await res.json()) as Array<Record<string, unknown>>;
  const data: Activity[] = rows.map((r, i) => ({
    id: i + 1,
    slug: String(r.slug ?? ""),
    title: String(r.name ?? ""),
    location: String(r.city ?? r.region ?? ""),
    city: String(r.region ?? r.city ?? ""),
    rating: Number(r.rating ?? 0),
    reviewCount: Number(r.reviews_count ?? 0),
    ageRange: "",
    isIndoor: false,
    tags: [String(r.type ?? "")].filter(Boolean),
    description: (r.description as string | null) ?? undefined,
    address: (r.address as string | null) ?? undefined,
    website: (r.website as string | null) ?? undefined,
    latitude: Number(r.lat ?? 0),
    longitude: Number(r.lng ?? 0),
    openingHours: (r.opening_hours as string | null) ?? undefined,
    priceRange: (r.price_note as string | null) ?? undefined,
    imageUrl: (r.image_url as string | null) ?? undefined,
  }));
  cache = { at: Date.now(), data };
  return data;
}