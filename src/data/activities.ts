// Activity data module — loads from /data/activities.json with fallback

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
  reviews?: { author: string; rating: number; text: string; date: string }[];
  latitude: number;
  longitude: number;
  slug: string;
  amenities?: string[];
  priceLevel?: 0 | 1 | 2 | 3;
  priceNote?: string;
  isRecommended?: boolean;
  googlePlaceId?: string;
}

export const PRICE_LEVELS = {
  0: { label: "Bezpłatne", badge: "Bezpłatne", color: "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/30 dark:border-green-800" },
  1: { label: "Niedrogie", badge: "$", color: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800" },
  2: { label: "Umiarkowane", badge: "$$", color: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800" },
  3: { label: "Drogie", badge: "$$$", color: "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-800" },
} as const;

// --- Async data loading ---

import { fallbackActivities } from "./fallbackActivities";

let _activities: Activity[] = fallbackActivities;
let _loaded = false;

export async function loadActivities(): Promise<Activity[]> {
  if (_loaded) return _activities;
  try {
    const response = await fetch('/data/activities.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data: Activity[] = await response.json();
    _activities = data.map(a => ({ ...a, reviewCount: a.reviews?.length || 0 }));
    _loaded = true;
  } catch (err) {
    console.warn('Ładuję dane fallback:', err);
    _activities = fallbackActivities.map(a => ({ ...a, reviewCount: a.reviews?.length || 0 }));
    _loaded = true;
  }
  return _activities;
}

/** Synchronous getter — returns loaded activities (fallback if not yet loaded) */
export function getActivities(): Activity[] {
  return _activities;
}

/** Override activities in memory (e.g. from admin import) */
export function setActivities(data: Activity[]) {
  _activities = data;
  _loaded = true;
}

// Backward compatibility — same reference as getActivities()
// Components should migrate to getActivities() over time
export { _activities as mockActivities };

// Filter options with counts
export const filterOptions = {
  city: [
    { value: "warszawa", label: "Warszawa i okolice" },
    { value: "krakow", label: "Kraków i okolice" },
    { value: "wroclaw", label: "Wrocław i okolice" },
    { value: "trojmiasto", label: "Trójmiasto" },
    { value: "poznan", label: "Poznań i okolice" },
    { value: "slask", label: "Aglomeracja Śląska" },
    { value: "lodz", label: "Łódź i okolice" },
  ],
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
    { value: "muzeum-teatr", label: "Muzea i teatry" },
    { value: "sport", label: "Sport i ruch" },
    { value: "zoo", label: "Zoo i zwierzęta" },
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

// City center coordinates for distance calculations
export const cityCenters: Record<string, { lat: number; lng: number }> = {
  warszawa: { lat: 52.2297, lng: 21.0122 },
  krakow: { lat: 50.0647, lng: 19.9450 },
  wroclaw: { lat: 51.1079, lng: 17.0385 },
  trojmiasto: { lat: 54.3720, lng: 18.6382 },
  poznan: { lat: 52.4064, lng: 16.9252 },
  slask: { lat: 50.2649, lng: 19.0238 },
  lodz: { lat: 51.7592, lng: 19.4560 },
};
