import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { getActivities, filterOptions, Activity, cityCenters } from "@/data/activities";
import { FEATURES } from "@/lib/featureFlags";
import { getDistanceFromRegionCenter } from "@/lib/geoDistance";
import { useDataStatus } from "@/hooks/useDataStatus";
import { matchesSearchQuery } from "@/lib/searchMatch";
import type { FilterWriteOptions } from "@/hooks/useFilterSheetHistory";
import { REGION_SLUGS } from "@/data/regions";
import { CATEGORY_ORDER } from "@/data/categoryLabels";

/** Koniec suwaka „Atrakcje w pobliżu” (MobileFilterSheet, FilterBar). */
const MAX_DIST_KM = 100;

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
  // FMN-B81: wartości z adresu sprawdzamy, zanim pójdą do zapytania — tak jak
  // strona województwa (CategoryPage). Link z wielką literą albo literówką
  // (?region=Mazowieckie, ?type=Zoo,bzdura) dawał 0 wyników przy chipie bez
  // nazwy, bo serwer filtrował po nieistniejącej wartości. Wielkość liter
  // i półpauzę z etykiety („3–5”) poprawiamy, resztę nieznanego odrzucamy po
  // cichu. Sortu nie ruszamy: nazwa ze strony województwa (sort=reviews) działa.
  const urlFilters = useMemo<Filters>(() => {
    const next: Filters = {};
    const region = rawRegion?.trim().toLowerCase();
    if (region && REGION_SLUGS.includes(region)) next.city = region;
    const age = rawAge?.trim().replace(/[–—]/g, "-");
    if (age && filterOptions.age.some((o) => o.value === age)) next.age = age;
    if (rawType) {
      const typy = [
        ...new Set(
          rawType
            .split(",")
            .map((t) => t.trim().toLowerCase())
            .filter((t) => (CATEGORY_ORDER as readonly string[]).includes(t)),
        ),
      ];
      if (typy.length > 0) next.type = typy;
    }
    if (rawSort) next.sort = rawSort;
    // Promień tylko przy znanym województwie i w zakresie suwaka (0-100 km).
    const dist = rawDist ? Number(rawDist) : NaN;
    if (next.city && Number.isFinite(dist) && dist > 0 && dist <= MAX_DIST_KM) next.distance = dist;
    return next;
  }, [rawRegion, rawAge, rawType, rawSort, rawDist]);

  const [localFilters, setLocalFilters] = useState<LocalOnlyFilters>({});
  const filters = useMemo<Filters>(
    () => ({ ...urlFilters, ...localFilters }),
    [urlFilters, localFilters],
  );

  const rawSearch = searchParams.get("search") ?? "";
  const [searchQuery, ustawPoleFrazy] = useState(rawSearch);
  // Adres → pole wyszukiwania (m.in. „wstecz" w przeglądarce, Enter w HomeSearch).
  // W drugą stronę pisze `setSearchQuery` niżej, od razu — jeden pisarz na parametr.
  useEffect(() => {
    ustawPoleFrazy((prev) => (prev.trim() === rawSearch.trim() ? prev : rawSearch));
  }, [rawSearch]);

  // Katalog ładuje się asynchronicznie — bez tej zależności memo policzyłoby
  // się raz na pustej tablicy i utknęło do pierwszej interakcji z filtrem.
  const dataStatus = useDataStatus();

  // Każdy zapis filtra idzie funkcyjnie: `prev` jest zawsze świeży, więc
  // równoległy zapis mapy (lat/lng/zoom/cats) nie ginie pod starym snapshotem.
  // Świadoma zmiana filtra zostawia wpis w historii (push) — tak jak wcześniej.
  // `replace` zamawia tylko arkusz filtrów na telefonie, który sam dokłada wpis
  // (FMN-B05, useFilterSheetHistory).
  //
  // FMN-B06: zapis BEZ zmiany wartości i tak woła navigate(), a navigate robi
  // push — identyczny adres dostawał drugi wpis w historii. „Pokaż wyniki"
  // w arkuszu na telefonie zapisuje promień przy każdym wybranym regionie, więc
  // arkusz zamknięty bez zmian dokładał pusty wpis i „wstecz" nic nie zmieniało.
  // Identyczny adres = żaden zapis (w arkuszu atrapa zostaje wtedy na wierzchu,
  // patrz useFilterSheetHistory). Porównujemy z `searchParams` z routera, bo
  // to ten sam obiekt, który react-router podaje jako `prev` poniżej.
  //
  // FMN-B23: `prev` w setSearchParams to `searchParams` z DOMKNIĘCIA
  // (react-router 6.30), nie świeży adres. Dwa zapisy w tym samym takcie
  // (fraza + promień w „Pokaż wyniki”, fraza + filtry w „wyczyść poza
  // województwem”) startowały od tego samego starego adresu i drugi gubił
  // pierwszy. Drugi zapis startuje więc od wyniku pierwszego, dopóki router
  // nie odda nowego adresu (wtedy efekt niżej kasuje notatkę).
  const zapisWToku = useRef<{ baza: string; wynik: string } | null>(null);
  useEffect(() => {
    zapisWToku.current = null;
  }, [searchParams]);
  const zapiszFiltrDoUrl = useCallback(
    (mutuj: (params: URLSearchParams) => void, opcje?: FilterWriteOptions) => {
      const teraz = searchParams.toString();
      const wToku = zapisWToku.current;
      const baza = wToku && wToku.baza === teraz ? wToku.wynik : teraz;
      const docelowe = new URLSearchParams(baza);
      mutuj(docelowe);
      if (docelowe.toString() === baza) return;
      zapisWToku.current = { baza: teraz, wynik: docelowe.toString() };
      setSearchParams(docelowe, opcje?.replace ? { replace: true } : undefined);
    },
    // `searchParams` nie pogarsza stabilności: `setSearchParams` i tak zmienia
    // tożsamość po każdym zapisie adresu (react-router: [navigate, searchParams]).
    [searchParams, setSearchParams],
  );

  // FMN-B23: fraza idzie do adresu OD RAZU (replace), w tym samym takcie co
  // pole. Wcześniej Index.tsx pisał ją z opóźnieniem 300 ms, a drugi efekt
  // czytał adres przy KAŻDEJ jego zmianie: zapis kadru mapy albo klik
  // kategorii w tym oknie kasował świeżą frazę ze stanu (pole „łódź”, adres
  // i wyniki bez frazy, F5 zmieniał wynik). Samo pisanie w polu nadal adresu
  // nie zmienia — pole woła to dopiero na Enter / wybór podpowiedzi.
  const setSearchQuery = useCallback(
    (q: string) => {
      ustawPoleFrazy(q);
      const fraza = q.trim();
      zapiszFiltrDoUrl(
        (params) => {
          if (fraza) params.set("search", fraza);
          else params.delete("search");
        },
        { replace: true },
      );
    },
    [zapiszFiltrDoUrl],
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
    (key: keyof Filters, value: string | string[] | number | undefined, opcje?: FilterWriteOptions) => {
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
      }, opcje);
    },
    [zapiszFiltrDoUrl],
  );

  // Przełączenie jednej wartości w filtrze wielokrotnym (jedyny taki filtr to `type`).
  const toggleArrayFilter = useCallback(
    (key: "type", value: string, opcje?: FilterWriteOptions) => {
      zapiszFiltrDoUrl((params) => {
        const current = (params.get(key) ?? "").split(",").filter(Boolean);
        const next = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        if (next.length) params.set(key, next.join(","));
        else params.delete(key);
      }, opcje);
    },
    [zapiszFiltrDoUrl],
  );

  const clearAllFilters = useCallback((opcje?: FilterWriteOptions) => {
    setLocalFilters({});
    // Samo pole: fraza znika z adresu w tym samym (jednym) zapisie niżej.
    ustawPoleFrazy("");
    zapiszFiltrDoUrl((params) => {
      for (const klucz of URL_FILTER_KEYS) params.delete(klucz);
      params.delete("search");
    }, opcje);
  }, [zapiszFiltrDoUrl]);

  // Katalog po stałych warunkach (bez wydarzeń, tylko włączone województwa) i po frazie,
  // liczony raz na zmianę frazy albo katalogu, a nie przy każdym kliku filtra. Wcześniej
  // filterCounts przepuszczał przez matchesSearchQuery cały katalog 36 razy (raz na opcję
  // filtra): przy frazie klik kategorii zajmował wątek ok. 5 s przy CPU 4x (FMN wiersz 20).
  // Kluczem jest też tablica katalogu: setActivities podmienia ją w całości.
  const katalog = getActivities();
  const bazaFrazy = useMemo(() => {
    let result = katalog;

    // Hide events when feature flag is off
    if (!FEATURES.EVENTS) {
      result = result.filter(a => !a.isEvent);
    }

    // Filter to enabled cities only
    result = result.filter(a => FEATURES.ENABLED_CITIES.includes(a.city));

    // Fraza i filtry łączą się warunkiem AND.
    if (searchQuery.trim().length > 0) {
      result = result.filter((a) => matchesSearchQuery(a, searchQuery));
    }
    return result;
  }, [katalog, searchQuery, dataStatus]);

  const filteredActivities = useMemo(() => {
    // Kopia: sortowanie niżej działa w miejscu, a bazaFrazy jest współdzielona.
    let result = [...bazaFrazy];

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
  }, [filters, bazaFrazy]);

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
      // Start with activities matching the search query (if any) — bez wydarzeń,
      // tylko włączone województwa; wspólne dla wszystkich opcji (bazaFrazy wyżej).
      let result = bazaFrazy;

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
  }, [filters, filteredActivities.length, searchQuery, dataStatus, bazaFrazy]);

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
