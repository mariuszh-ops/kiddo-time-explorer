// Geographic distance utilities — Haversine formula and per-region centers.
// Used by sort options like "Najbliżej centrum" without needing user geolocation.

import type { Activity } from "@/data/activities";

/**
 * Coordinates of city/region centers, keyed by the same `city` value used
 * across the app (see filterOptions.city in src/data/activities.ts).
 */
export const REGION_CENTERS: Record<string, { lat: number; lng: number }> = {
  warszawa: { lat: 52.2297, lng: 21.0122 },
  slask: { lat: 50.2649, lng: 19.0238 },     // Katowice — Rynek
  krakow: { lat: 50.0614, lng: 19.9366 },    // Rynek Główny
  wroclaw: { lat: 51.1101, lng: 17.0326 },   // Rynek
  trojmiasto: { lat: 54.3520, lng: 18.6466 },// Gdańsk Główny
  poznan: { lat: 52.4069, lng: 16.9299 },    // Stary Rynek
  lodz: { lat: 51.7592, lng: 19.4560 },      // Piotrkowska
};

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
