import { useState, useMemo, useCallback } from "react";
import { mockActivities, filterOptions, Activity } from "@/data/activities";

export interface Filters {
  city?: string;
  age?: string;
  type?: string;
  indoor?: string;
  search?: string;
}

export function useActivityFilters() {
  const [filters, setFilters] = useState<Filters>({});
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
  const filterCounts = useMemo(() => {
    const getCountForFilter = (
      key: keyof Filters,
      value: string,
      baseFilters: Filters
    ) => {
      const testFilters = { ...baseFilters, [key]: value };
      let result = mockActivities;

      if (testFilters.city) {
        result = result.filter((a) => a.city === testFilters.city);
      }

      if (testFilters.age) {
        const ageOption = filterOptions.age.find((o) => o.value === testFilters.age);
        if (ageOption) {
          result = result.filter(
            (a) => a.ageMin <= ageOption.max && a.ageMax >= ageOption.min
          );
        }
      }

      if (testFilters.type) {
        result = result.filter((a) => a.type === testFilters.type);
      }

      if (testFilters.indoor) {
        const isIndoor = testFilters.indoor === "indoor";
        result = result.filter((a) => a.isIndoor === isIndoor);
      }

      return result.length;
    };

    // Get counts without the current filter applied
    const filtersWithoutCity = { ...filters, city: undefined };
    const filtersWithoutAge = { ...filters, age: undefined };
    const filtersWithoutType = { ...filters, type: undefined };
    const filtersWithoutIndoor = { ...filters, indoor: undefined };

    return {
      city: filterOptions.city.map((o) => ({
        ...o,
        count: getCountForFilter("city", o.value, filtersWithoutCity),
      })),
      age: filterOptions.age.map((o) => ({
        ...o,
        count: getCountForFilter("age", o.value, filtersWithoutAge),
      })),
      type: filterOptions.type.map((o) => ({
        ...o,
        count: getCountForFilter("type", o.value, filtersWithoutType),
      })),
      indoor: filterOptions.indoor.map((o) => ({
        ...o,
        count: getCountForFilter("indoor", o.value, filtersWithoutIndoor),
      })),
      total: mockActivities.length,
      filtered: filteredActivities.length,
    };
  }, [filters, filteredActivities.length]);

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
