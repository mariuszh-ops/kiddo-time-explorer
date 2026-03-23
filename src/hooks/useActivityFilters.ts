import { useState, useMemo, useCallback, useEffect } from "react";
import { mockActivities, filterOptions, Activity, cityCenters } from "@/data/activities";
import { FEATURES } from "@/lib/featureFlags";

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getActivityDistance(activity: Activity, cityKey: string): number | null {
  const center = cityCenters[cityKey];
  if (!center) return null;
  return getDistanceKm(center.lat, center.lng, activity.latitude, activity.longitude);
}

export interface Filters {
  city?: string;
  age?: string;
  type?: string;
  indoor?: string;
  activityKind?: string; // "place" | "event"
  distance?: number; // 0-100 km (numeric slider value)
  search?: string;
  price?: string; // "free" | "paid"
}

// Persist filter state outside component to survive navigation
let persistedFilters: Filters = {};
let persistedSearchQuery: string = "";

export function useActivityFilters() {
  // Initialize from persisted state
  const [filters, setFilters] = useState<Filters>(persistedFilters);
  const [searchQuery, setSearchQuery] = useState(persistedSearchQuery);

  // Sync to persisted state whenever filters change
  useEffect(() => {
    persistedFilters = filters;
  }, [filters]);

  useEffect(() => {
    persistedSearchQuery = searchQuery;
  }, [searchQuery]);

  const updateFilter = useCallback((key: keyof Filters, value: string | number | undefined) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      if (value === undefined) {
        delete newFilters[key];
      } else {
        // @ts-ignore - we handle both string and number values
        newFilters[key] = value;
      }
      // Clear distance filter when city is cleared
      if (key === "city" && value === undefined) {
        delete newFilters.distance;
      }
      // Set default distance when city is first selected
      if (key === "city" && value !== undefined && prev.distance === undefined) {
        newFilters.distance = 15; // Default 15 km
      }
      return newFilters;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    // Complete reset - clear both local and persisted state
    setFilters({});
    setSearchQuery("");
    persistedFilters = {};
    persistedSearchQuery = "";
  }, []);

  const filteredActivities = useMemo(() => {
    let result = [...mockActivities];

    // Hide events when feature flag is off
    if (!FEATURES.EVENTS) {
      result = result.filter(a => !a.isEvent);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.location.toLowerCase().includes(query) ||
          a.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Filter by city
    if (filters.city) {
      result = result.filter((a) => a.city === filters.city);
    }

    // Filter by age range
    if (filters.age) {
      const ageOption = filterOptions.age.find((o) => o.value === filters.age);
      if (ageOption) {
        result = result.filter(
          (a) => a.ageMin <= ageOption.max && a.ageMax >= ageOption.min
        );
      }
    }

    // Filter by type
    if (filters.type) {
      result = result.filter((a) => a.type === filters.type);
    }

    // Filter by indoor/outdoor
    if (filters.indoor) {
      const isIndoor = filters.indoor === "indoor";
      result = result.filter((a) => a.isIndoor === isIndoor);
    }

    // Filter by activity kind (place/event) — only when EVENTS feature enabled
    if (FEATURES.EVENTS && filters.activityKind) {
      const isEvent = filters.activityKind === "event";
      result = result.filter((a) => (a.isEvent ?? false) === isEvent);
    }

    // Distance filter — active only when city selected and distance > 0
    if (filters.city && filters.distance !== undefined && filters.distance > 0) {
      const center = cityCenters[filters.city];
      if (center) {
        result = result.filter((a) => {
          const dist = getDistanceKm(center.lat, center.lng, a.latitude, a.longitude);
          return dist <= filters.distance!;
        });
      }
    }

    // Price filter
    if (filters.price) {
      if (filters.price === "free") {
        result = result.filter(a => a.priceLevel === 0);
      } else {
        result = result.filter(a => a.priceLevel !== undefined && a.priceLevel > 0);
      }
    }

    // Sort: rating > reviewCount > matchPercentage
    result.sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
      return b.matchPercentage - a.matchPercentage;
    });

    return result;
  }, [filters, searchQuery]);

  // Calculate counts for each filter option
  // Contextual: shows how many results will remain if you select this option
  const filterCounts = useMemo(() => {
    const hasAnyFilter = Boolean(Object.values(filters).some(Boolean) || searchQuery.trim());
    
    // Helper: Apply all filters except one, then count how many match a specific value
    const getCountForFilter = (
      key: keyof Filters,
      value: string,
      otherFilters: Filters
    ) => {
      // Start with activities matching the search query (if any)
      let result = [...mockActivities];

      // Hide events when feature flag is off
      if (!FEATURES.EVENTS) {
        result = result.filter(a => !a.isEvent);
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        result = result.filter(
          (a) =>
            a.title.toLowerCase().includes(query) ||
            a.location.toLowerCase().includes(query) ||
            a.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      }

      // Apply all OTHER filters (not the one we're calculating for)
      if (key !== "city" && otherFilters.city) {
        result = result.filter((a) => a.city === otherFilters.city);
      }

      if (key !== "age" && otherFilters.age) {
        const ageOption = filterOptions.age.find((o) => o.value === otherFilters.age);
        if (ageOption) {
          result = result.filter(
            (a) => a.ageMin <= ageOption.max && a.ageMax >= ageOption.min
          );
        }
      }

      if (key !== "type" && otherFilters.type) {
        result = result.filter((a) => a.type === otherFilters.type);
      }

      if (key !== "indoor" && otherFilters.indoor) {
        const isIndoor = otherFilters.indoor === "indoor";
        result = result.filter((a) => a.isIndoor === isIndoor);
      }

      if (key !== "activityKind" && otherFilters.activityKind) {
        const isEvent = otherFilters.activityKind === "event";
        result = result.filter((a) => (a.isEvent ?? false) === isEvent);
      }

      if (key !== "price" && otherFilters.price) {
        if (otherFilters.price === "free") {
          result = result.filter(a => a.priceLevel === 0);
        } else {
          result = result.filter(a => a.priceLevel !== undefined && a.priceLevel > 0);
        }
      }

      // Now count how many of these remaining activities match the target value
      if (key === "city") {
        return result.filter((a) => a.city === value).length;
      } else if (key === "age") {
        const ageOption = filterOptions.age.find((o) => o.value === value);
        if (ageOption) {
          return result.filter(
            (a) => a.ageMin <= ageOption.max && a.ageMax >= ageOption.min
          ).length;
        }
        return 0;
      } else if (key === "type") {
        return result.filter((a) => a.type === value).length;
      } else if (key === "indoor") {
        const isIndoor = value === "indoor";
        return result.filter((a) => a.isIndoor === isIndoor).length;
      } else if (key === "activityKind") {
        const isEvent = value === "event";
        return result.filter((a) => (a.isEvent ?? false) === isEvent).length;
      } else if (key === "price") {
        if (value === "free") {
          return result.filter(a => a.priceLevel === 0).length;
        } else {
          return result.filter(a => a.priceLevel !== undefined && a.priceLevel > 0).length;
        }
      }

      return 0;
    };

    return {
      city: filterOptions.city.map((o) => ({
        ...o,
        count: getCountForFilter("city", o.value, filters),
      })),
      age: filterOptions.age.map((o) => ({
        ...o,
        count: getCountForFilter("age", o.value, filters),
      })),
      type: filterOptions.type.map((o) => ({
        ...o,
        count: getCountForFilter("type", o.value, filters),
      })),
      indoor: filterOptions.indoor.map((o) => ({
        ...o,
        count: getCountForFilter("indoor", o.value, filters),
      })),
      activityKind: filterOptions.activityKind.map((o) => ({
        ...o,
        count: getCountForFilter("activityKind", o.value, filters),
      })),
      // Distance is now a numeric slider, no options needed
      // Keep for backward compatibility but won't be used for dropdown
      distance: [],
      price: filterOptions.price.map((o) => ({
        ...o,
        count: getCountForFilter("price", o.value, filters),
      })),
      total: mockActivities.length,
      filtered: filteredActivities.length,
      hasAnyFilter,
    };
  }, [filters, filteredActivities.length, searchQuery]);

  return {
    filters,
    searchQuery,
    setSearchQuery,
    updateFilter,
    clearAllFilters,
    filteredActivities,
    filterCounts,
  };
}
