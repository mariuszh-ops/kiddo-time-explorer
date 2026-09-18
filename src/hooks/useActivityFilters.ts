import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getActivities, filterOptions, Activity, cityCenters } from "@/data/activities";
import { FEATURES } from "@/lib/featureFlags";
import { getDistanceFromRegionCenter } from "@/lib/geoDistance";
import { useDataStatus } from "@/hooks/useDataStatus";
import { matchesSearchQuery } from "@/lib/searchMatch";

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
  type?: string[]; // multi-select: array of category values
  indoor?: string;
  activityKind?: string; // "place" | "event"
  distance?: number; // 0-100 km (numeric slider value)
  search?: string;
  price?: string; // "free" | "paid"
  sort?: string; // "rating" | "most_reviewed" | "name"
}

// Nazwy parametrów w adresie — spójne ze stronami /kategoria/* i /atrakcje/*.
// Brak parametru = BRAK filtra. Adres jest JEDYNYM źródłem prawdy dla tych pięciu.
const URL_FILTER_KEYS = ["region", "age", "type", "sort", "dist"] as const;

// Filtry bez własnego parametru w adresie (UI ukryte w FilterBar/MobileFilterSheet,
// logika w `filteredActivities` zostaje). Trzymane lokalnie — tak samo jak wcześniej
// nie przeżywały zmiany adresu.
type LocalOnlyFilters = Pick<Filters, "indoor" | "price" | "activityKind">;
const LOCAL_ONLY_KEYS = ["indoor", "price", "activityKind"] as const;
type LocalOnlyKey = (typeof LOCAL_ONLY_KEYS)[number];

function isLocalOnly(key: keyof Filters): key is LocalOnlyKey {
  return (LOCAL_ONLY_KEYS as readonly string[]).includes(key);
}

export function useActivityFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filtry NIE mają drugiej kopii w `useState` — liczymy je wprost z adresu.
  //
  // Wcześniej adres i stan były lustrem, a dwa efekty (URL→stan, stan→URL)
  // chodziły w przeciwfazie: writer zapisywał adres z bieżącego stanu, reader
  // ustawiał stan z POPRZEDNIEGO adresu. Zmierzone na nagraniu 18.09.2026:
  // `?type=` znikało i wracało co ~0,37 s, chip „Kategoria" mrugał i nie dawał
  // się kliknąć, a kategoria łapała dopiero po ruchu mapą — bo
  // `handleSaveMapState` był jedynym zapisem funkcyjnym (od świeżego stanu)
  // i resynchronizował parę. Jedno źródło prawdy = pętla nie ma z czego powstać.
  const rawRegion = searchParams.get("region");
  const rawAge = searchParams.get("age");
  const rawType = searchParams.get("type");
  const rawSort = searchParams.get("sort");
  const rawDist = searchParams.get("dist");
  // Memo po surowych wartościach, nie po całym `searchParams`: zapis mapy
  // (lat/lng/zoom/cats) nie ma zmieniać tożsamości `filters`.
  const urlFilters = useMemo<Filters>(() => {
    const next: Filters = {};
    if (rawRegion) next.city = rawRegion;
    if (rawAge) next.age = rawAge;
    if (rawType) next.type = rawType.split(",").filter(Boolean);
    if (rawSort) next.sort = rawSort;
    const dist = rawDist ? Number(rawDist) : NaN;
    if (rawRegion && Number.isFinite(dist) && dist > 0) next.distance = dist;
    return next;
  }, [rawRegion, rawAge, rawType, rawSort, rawDist]);

  const [localFilters, setLocalFilters] = useState<LocalOnlyFilters>({});
  const filters = useMemo<Filters>(
    () => ({ ...urlFilters, ...localFilters }),
    [urlFilters, localFilters],
  );

  const rawSearch = searchParams.get("search") ?? "";
  const [searchQuery, setSearchQuery] = useState(rawSearch);
  // Adres → pole wyszukiwania (m.in. „wstecz" w przeglądarce). W drugą stronę
  // pisze Index.tsx (debounce 300 ms, replace) — jeden pisarz na parametr.
  useEffect(() => {
    setSearchQuery((prev) => (prev.trim() === rawSearch.trim() ? prev : rawSearch));
  }, [rawSearch]);

  // Katalog ładuje się asynchronicznie — bez tej zależności memo policzyłoby
  // się raz na pustej tablicy i utknęło do pierwszej interakcji z filtrem.
  const dataStatus = useDataStatus();

  // Każdy zapis filtra idzie funkcyjnie: `prev` jest zawsze świeży, więc
  // równoległy zapis mapy (lat/lng/zoom/cats) nie ginie pod starym snapshotem.
  // Świadoma zmiana filtra zostawia wpis w historii (push) — tak jak wcześniej.
  const zapiszFiltrDoUrl = useCallback(
    (mutuj: (params: URLSearchParams) => void) => {
      setSearchParams((prev) => {
        mutuj(prev);
        return prev;
      });
    },
    [setSearchParams],
  );


  // Q-E-10b: ten hook NIE dociąga już katalogu. Siatkę wyników i liczniki przy
  // opcjach filtrów liczy serwer (useHomeCatalog → rpc('ff_home_list') /
  // rpc('ff_home_counts')), więc filtr na stronie głównej nie sprowadza już
  // 4892 wierszy do pamięci. `filteredActivities` i `filterCounts` poniżej
  // zostają dla JEDNEJ ścieżki, która wciąż potrzebuje kompletu w pamięci:
  // widoku mapy z filtrem (mapa rysuje wszystkie pasujące piny, nie stronę).
  // Ładowanie katalogu dla tej ścieżki włącza Index.tsx własnym efektem
  // `if (viewMode === "map" && hasActiveFilters) ensureActivitiesLoaded()`.

  const updateFilter = useCallback(
    (key: keyof Filters, value: string | string[] | number | undefined) => {
      const pusty = value === undefined || (Array.isArray(value) && value.length === 0);
      if (isLocalOnly(key)) {
        setLocalFilters((prev) => {
          const next = { ...prev };
          if (pusty) delete next[key];
          else next[key] = String(value);
          return next;
        });
        return;
      }
      zapiszFiltrDoUrl((params) => {
        const ustaw = (nazwa: string, wartosc?: string) => {
          if (wartosc) params.set(nazwa, wartosc);
          else params.delete(nazwa);
        };
        switch (key) {
          case "city":
            ustaw("region", pusty ? undefined : String(value));
            // Wyczyszczenie regionu kasuje też promień — `dist` bez regionu nic nie znaczy.
            if (pusty) params.delete("dist");
            // Przy WYBORZE regionu promień celowo zostaje pusty: użytkownik ma
            // najpierw zobaczyć całe województwo i świadomie zawęzić suwakiem.
            break;
          case "age":
            ustaw("age", pusty ? undefined : String(value));
            break;
          case "type":
            ustaw("type", pusty ? undefined : (value as string[]).join(","));
            break;
          case "sort":
            ustaw("sort", pusty ? undefined : String(value));
            break;
          case "distance":
            // `dist` zapisujemy tylko przy wybranym regionie (tak jak wcześniej).
            ustaw("dist", pusty || !params.get("region") ? undefined : String(value));
            break;
          default:
            break;
        }
      });
    },
    [zapiszFiltrDoUrl],
  );

  // Przełączenie jednej wartości w filtrze wielokrotnym (jedyny taki filtr to `type`).
  const toggleArrayFilter = useCallback(
    (key: "type", value: string) => {
      zapiszFiltrDoUrl((params) => {
        const current = (params.get(key) ?? "").split(",").filter(Boolean);
        const next = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        if (next.length) params.set(key, next.join(","));
        else params.delete(key);
      });
    },
    [zapiszFiltrDoUrl],
  );

  const clearAllFilters = useCallback(() => {
    setLocalFilters({});
    setSearchQuery("");
    zapiszFiltrDoUrl((params) => {
      for (const klucz of URL_FILTER_KEYS) params.delete(klucz);
      params.delete("search");
    });
  }, [zapiszFiltrDoUrl]);

  const filteredActivities = useMemo(() => {
    let result = [...getActivities()];

    // Hide events when feature flag is off
    if (!FEATURES.EVENTS) {
      result = result.filter(a => !a.isEvent);
    }

    // Filter to enabled cities only
    result = result.filter(a => FEATURES.ENABLED_CITIES.includes(a.city));

    // Fraza i filtry łączą się warunkiem AND.
    const isSearchActive = searchQuery.trim().length > 0;

    // Filter by search query
    if (isSearchActive) {
      result = result.filter((a) => matchesSearchQuery(a, searchQuery));
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

    // Filter by type (multi-select OR logic)
    if (filters.type && filters.type.length > 0) {
      result = result.filter((a) => filters.type!.includes(a.type));
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

    // Dynamic sorting
    const sortKey = filters.sort || "rating";

    // Pre-compute distance from region center once per activity (memoized via useMemo
    // wrapping this whole block) — avoids recalculating inside the comparator.
    if (sortKey === "distance-from-center") {
      const distanceMap = new Map<number, number>();
      result.forEach((a) => distanceMap.set(a.id, getDistanceFromRegionCenter(a)));
      result.sort((a, b) => {
        const da = distanceMap.get(a.id) ?? Infinity;
        const db = distanceMap.get(b.id) ?? Infinity;
        return da - db;
      });

      return result;
    }

    switch (sortKey) {
      case "rating":
        result.sort((a, b) => {
          if (b.rating !== a.rating) return b.rating - a.rating;
          if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
          return b.matchPercentage - a.matchPercentage;
        });
        break;
      case "most_reviewed":
        result.sort((a, b) => {
          if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
          return b.rating - a.rating;
        });
        break;
      case "name":
        result.sort((a, b) => a.title.localeCompare(b.title, "pl"));
        break;
      case "google_rating":
        result.sort((a, b) => {
          const aR = a.google_rating ?? -1;
          const bR = b.google_rating ?? -1;
          if (bR !== aR) return bR - aR;
          return (b.google_review_count ?? 0) - (a.google_review_count ?? 0);
        });
        break;
      case "google_popular":
        result.sort((a, b) => {
          return (b.google_review_count ?? -1) - (a.google_review_count ?? -1);
        });
        break;
    }

    return result;
  }, [filters, searchQuery, dataStatus]);

  // Calculate counts for each filter option
  // Contextual: shows how many results will remain if you select this option
  const filterCounts = useMemo(() => {
    const hasAnyFilter = Boolean(Object.entries(filters).some(([_, v]) => Array.isArray(v) ? v.length > 0 : Boolean(v)) || searchQuery.trim());
    
    // Helper: Apply all filters except one, then count how many match a specific value
    const getCountForFilter = (
      key: keyof Filters,
      value: string,
      otherFilters: Filters
    ) => {
      // Start with activities matching the search query (if any)
      let result = [...getActivities()];

      // Hide events when feature flag is off
      if (!FEATURES.EVENTS) {
        result = result.filter(a => !a.isEvent);
      }

      // Filter to enabled cities only
      result = result.filter(a => FEATURES.ENABLED_CITIES.includes(a.city));
      if (searchQuery.trim()) {
        result = result.filter((a) => matchesSearchQuery(a, searchQuery));
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

      if (key !== "type" && otherFilters.type && otherFilters.type.length > 0) {
        result = result.filter((a) => otherFilters.type!.includes(a.type));
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
      total: getActivities().filter(a => FEATURES.ENABLED_CITIES.includes(a.city) && (FEATURES.EVENTS || !a.isEvent)).length,
      filtered: filteredActivities.length,
      hasAnyFilter,
    };
  }, [filters, filteredActivities.length, searchQuery, dataStatus]);

  return {
    filters,
    searchQuery,
    setSearchQuery,
    updateFilter,
    toggleArrayFilter,
    clearAllFilters,
    filteredActivities,
    filterCounts,
  };
}
