import { useState, useMemo, useCallback } from "react";
import { mockActivities, filterOptions, Activity } from "@/data/activities";

export interface Filters {
  city?: string;
  age?: string;
  type?: string;
  indoor?: string;
  search?: string;
}

export function useActivityFilters(initialCity?: string) {
  const [filters, setFilters] = useState<Filters>(() => 
    initialCity ? { city: initialCity } : {}
  );
  const [searchQuery, setSearchQuery] = useState("");

  const updateFilter = useCallback((key: keyof Filters, value: string | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({});
    setSearchQuery("");
  }, []);

  const filteredActivities = useMemo(() => {
    let result = [...mockActivities];

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

      // Now count how many of these remaining activities match the target value
      if (key === "city") {
        return result.filter((a) => a.city === value).length;
      } else if (key === "age") {
        const ageOption = filterOptions.age.find((o) => o.value === value);
        if (ageOption) {
          // Count unique activities matching this age range
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
