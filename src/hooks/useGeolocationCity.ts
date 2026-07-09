import { useState, useEffect } from "react";
import { REGIONS } from "@/data/regions";

// Nearest-region lookup (bez limitu promienia — zawsze wybieramy najbliższe
// województwo). Współrzędne = stolice województw z src/data/regions.ts.
const CITY_COORDINATES = REGIONS.map((r) => ({
  city: r.slug,
  lat: r.center.lat,
  lon: r.center.lng,
  radius: 120,
}));

const DEFAULT_CITY = "mazowieckie";

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function findNearestCity(lat: number, lon: number): string {
  let nearestCity = DEFAULT_CITY;
  let minDistance = Infinity;

  for (const cityData of CITY_COORDINATES) {
    const distance = haversineDistance(lat, lon, cityData.lat, cityData.lon);
    if (distance < minDistance && distance <= cityData.radius) {
      minDistance = distance;
      nearestCity = cityData.city;
    }
  }

  // If no city within radius, find the absolute nearest
  if (minDistance === Infinity) {
    for (const cityData of CITY_COORDINATES) {
      const distance = haversineDistance(lat, lon, cityData.lat, cityData.lon);
      if (distance < minDistance) {
        minDistance = distance;
        nearestCity = cityData.city;
      }
    }
  }

  return nearestCity;
}

export function useGeolocationCity() {
  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);

  const detectCity = async (): Promise<string> => {
    setIsLoading(true);
    
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setDetectedCity(DEFAULT_CITY);
        setIsLoading(false);
        setHasAttempted(true);
        resolve(DEFAULT_CITY);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const city = findNearestCity(position.coords.latitude, position.coords.longitude);
          setDetectedCity(city);
          setIsLoading(false);
          setHasAttempted(true);
          resolve(city);
        },
        () => {
          // User denied or error - use default
          setDetectedCity(DEFAULT_CITY);
          setIsLoading(false);
          setHasAttempted(true);
          resolve(DEFAULT_CITY);
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    });
  };

  return {
    detectedCity,
    isLoading,
    hasAttempted,
    detectCity,
    defaultCity: DEFAULT_CITY,
  };
}
