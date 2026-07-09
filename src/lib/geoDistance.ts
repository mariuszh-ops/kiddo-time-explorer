// Geographic distance utilities — Haversine formula and per-region centers.
// Used by sort options like "Najbliżej centrum" without needing user geolocation.

import type { Activity } from "@/data/activities";
import { REGIONS } from "@/data/regions";

/**
 * Coordinates of city/region centers, keyed by the same `city` value used
 * across the app (see filterOptions.city in src/data/activities.ts).
 */
export const REGION_CENTERS: Record<string, { lat: number; lng: number }> =
  REGIONS.reduce(
    (acc, r) => ({ ...acc, [r.slug]: r.center }),
    {} as Record<string, { lat: number; lng: number }>,
  );

/**
 * Haversine great-circle distance between two coordinates in kilometers.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Distance (km) from an activity to the center of its own region.
 * Returns Infinity if coordinates or region center are missing — those
 * activities will sort to the bottom rather than crash.
 */
export function getDistanceFromRegionCenter(activity: Activity): number {
  const center = REGION_CENTERS[activity.city];
  if (
    !center ||
    typeof activity.latitude !== "number" ||
    typeof activity.longitude !== "number" ||
    Number.isNaN(activity.latitude) ||
    Number.isNaN(activity.longitude)
  ) {
    return Infinity;
  }
  return haversineDistance(center.lat, center.lng, activity.latitude, activity.longitude);
}
