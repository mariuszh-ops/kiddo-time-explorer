// Data helper for MCP tools. Runs inside the Supabase Edge Function (Deno),
// so it must NOT import project-side modules that touch the browser.
// It fetches the static activities.json served from the published site.

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

const DATA_URL = "https://familyfun.pl/data/activities.json";

let cache: { at: number; data: Activity[] } | null = null;
const TTL_MS = 5 * 60 * 1000;

export async function fetchActivities(): Promise<Activity[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  const res = await fetch(DATA_URL, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Failed to load activities: ${res.status}`);
  const data = (await res.json()) as Activity[];
  cache = { at: Date.now(), data };
  return data;
}