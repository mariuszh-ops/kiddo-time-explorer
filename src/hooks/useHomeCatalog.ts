import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { catalogClient, mapCatalogRow, CARD_COLUMNS, type CatalogRow } from "@/lib/catalogClient";
import { cityCenters, filterOptions, type Activity } from "@/data/activities";
import { tokenizeQuery } from "@/lib/searchMatch";
import type { Filters } from "@/hooks/useActivityFilters";

const QUERY_TIMEOUT_MS = 15000;
/** Wpisywanie w szukajkę nie może odpalać zapytania na każdy znak. */
const DEBOUNCE_MS = 250;

export const HOME_PAGE_SIZE = 24;

/** Kontekstowe liczniki zwracane przez rpc('ff_home_counts'). */
interface SurowiLicznicy {
  region: Record<string, number>;
  type: Record<string, number>;
  age: Record<string, number>;
  filtered: number;
  total: number;
}

/** Kształt oczekiwany przez FilterBar / MobileFilterSheet (dawniej liczony w pamięci). */
export interface HomeFilterCounts {
  city: { value: string; label: string; count: number }[];
  age: { value: string; label: string; count: number }[];
  type: { value: string; label: string; count: number }[];
  indoor: { value: string; label: string; count: number }[];
  activityKind: { value: string; label: string; count: number }[];
  distance: { value: string; label: string; count: number }[];
  price: { value: string; label: string; count: number }[];
  total: number;
  filtered: number;
  hasAnyFilter: boolean;
}

export interface UseHomeCatalogResult {
  activities: Activity[];
  filterCounts: HomeFilterCounts;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => void;
  refetch: () => void;
}

/** Argumenty obu funkcji RPC wyprowadzone ze stanu filtrów. */
interface ArgumentyRpc {
  p_region: string | null;
  p_types: string[] | null;
  p_age_min: number | null;
  p_age_max: number | null;
  p_tokens: string[] | null;
  p_radius_km: number | null;
  p_center_lat: number | null;
  p_center_lng: number | null;
}

function zbudujArgumenty(filters: Filters, searchQuery: string): ArgumentyRpc {
  const kubelek = filters.age ? filterOptions.age.find((o) => o.value === filters.age) : undefined;
  const srodek = filters.city ? cityCenters[filters.city] : undefined;
  // Promień działa wyłącznie razem z wybranym województwem — tak samo jak
  // na kliencie, gdzie suwak siedzi w dropdownie województwa.
  const promien =
    srodek && typeof filters.distance === "number" && filters.distance > 0 ? filters.distance : null;
  const tokeny = tokenizeQuery(searchQuery);

  return {
    p_region: filters.city ?? null,
    p_types: filters.type && filters.type.length > 0 ? filters.type : null,
    p_age_min: kubelek ? kubelek.min : null,
    p_age_max: kubelek ? kubelek.max : null,
    p_tokens: tokeny.length > 0 ? tokeny : null,
    p_radius_km: promien,
    p_center_lat: promien && srodek ? srodek.lat : null,
    p_center_lng: promien && srodek ? srodek.lng : null,
  };
}

// Definicja przedziałów wieku jedzie z frontu, żeby nie rozjechała się z UI.
const KUBELKI_WIEKU = filterOptions.age.map((o) => ({ value: o.value, min: o.min, max: o.max }));

const PUSTE_LICZNIKI: SurowiLicznicy = { region: {}, type: {}, age: {}, filtered: 0, total: 0 };

/**
 * Filtry strony głównej liczone i stronicowane na SERWERZE (Q-E-10b).
 *
 * Zastępuje dwie rzeczy, które razem wymuszały ściągnięcie całego katalogu
 * (4892 wiersze, 534 kB po sieci / 2203 kB po dekompresji):
 *  - siatkę wyników → rpc('ff_home_list') po {@link HOME_PAGE_SIZE} rekordów,
 *  - liczniki przy 31 opcjach filtrów → rpc('ff_home_counts') jednym POST-em.
 *
 * Świadomie NIE obsługuje widoku mapy: mapa z filtrem potrzebuje WSZYSTKICH
 * pasujących pinów, nie jednej strony, więc Index zostawia jej klientowy
 * useActivityFilters i ensureActivitiesLoaded().
 */
export function useHomeCatalog(
  filters: Filters,
  searchQuery: string,
  /** false na trasach, które i tak renderują coś innego (mapa) — oszczędza zapytanie. */
  enabled = true,
): UseHomeCatalogResult {
  const argumenty = useMemo(() => zbudujArgumenty(filters, searchQuery), [filters, searchQuery]);
  const sort = filters.sort || "rating";
  const kluczSurowy = useMemo(() => JSON.stringify({ argumenty, sort }), [argumenty, sort]);

  // Klucz opóźniony — chroni przed zapytaniem na każdy znak w szukajce.
  const [kluczAktywny, setKluczAktywny] = useState(kluczSurowy);
  useEffect(() => {
    if (kluczSurowy === kluczAktywny) return;
    const id = setTimeout(() => setKluczAktywny(kluczSurowy), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [kluczSurowy, kluczAktywny]);

  const [activities, setActivities] = useState<Activity[]>([]);
  const [licznicy, setLicznicy] = useState<SurowiLicznicy>(PUSTE_LICZNIKI);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [zetonOdswiezenia, setZetonOdswiezenia] = useState(0);
  // Klucz, dla którego trwa bieżące zapytanie — odrzuca odpowiedzi po zmianie filtrów.
  const kluczWLocie = useRef(kluczAktywny);

  // Zmiana filtrów zaczyna listę od nowa.
  useEffect(() => {
    kluczWLocie.current = kluczAktywny;
    setPage(0);
    setActivities([]);
    setError(null);
  }, [kluczAktywny]);

  // Liczniki — jedno wywołanie na komplet 31 osi, niezależne od paginacji.
  useEffect(() => {
    if (!enabled) return;
    let anulowane = false;
    const kluczNaStarcie = kluczAktywny;
    const { argumenty: a, sort: _sort } = JSON.parse(kluczAktywny) as {
      argumenty: ArgumentyRpc;
      sort: string;
    };

    void (async () => {
      const { data, error: blad } = await catalogClient.rpc("ff_home_counts", {
        ...a,
        p_age_buckets: KUBELKI_WIEKU,
      });
      if (anulowane || kluczWLocie.current !== kluczNaStarcie) return;
      if (blad) {
        setError(blad instanceof Error ? blad : new Error(String(blad)));
        return;
      }
      setLicznicy((data as SurowiLicznicy | null) ?? PUSTE_LICZNIKI);
    })();

    return () => {
      anulowane = true;
    };
  }, [kluczAktywny, enabled, zetonOdswiezenia]);

  // Lista — strona po stronie.
  useEffect(() => {
    if (!enabled) return;
    let anulowane = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const kluczNaStarcie = kluczAktywny;
    const pierwszaStrona = page === 0;
    const { argumenty: a, sort: sortowanie } = JSON.parse(kluczAktywny) as {
      argumenty: ArgumentyRpc;
      sort: string;
    };

    if (pierwszaStrona) setLoading(true);
    else setLoadingMore(true);

    timeoutId = setTimeout(() => {
      if (anulowane) return;
      anulowane = true;
      setError(new Error("Przekroczono czas oczekiwania na odpowiedź serwera."));
      setLoading(false);
      setLoadingMore(false);
    }, QUERY_TIMEOUT_MS);

    void (async () => {
      try {
        const { data, error: blad } = await catalogClient
          .rpc("ff_home_list", {
            ...a,
            p_sort: sortowanie,
            p_region_centers: cityCenters,
            p_limit: HOME_PAGE_SIZE,
            p_offset: page * HOME_PAGE_SIZE,
          })
          // Zwężenie kolumn po stronie serwera — ciężkie jsonb-y (`reviews`,
          // `experience_points`) nie idą po sieci.
          .select(CARD_COLUMNS);
        if (blad) throw blad;
        if (anulowane || kluczWLocie.current !== kluczNaStarcie) return;
        const rows = (data as unknown as CatalogRow[] | null) ?? [];
        const zmapowane = rows.map((r, i) => mapCatalogRow(r, page * HOME_PAGE_SIZE + i));
        setActivities((prev) => (pierwszaStrona ? zmapowane : [...prev, ...zmapowane]));
        setError(null);
      } catch (e) {
        if (!anulowane) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (!anulowane) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    })();

    return () => {
      anulowane = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [kluczAktywny, page, enabled, zetonOdswiezenia]);

  const hasAnyFilter = useMemo(
    () =>
      Boolean(
        Object.entries(filters).some(([, v]) => (Array.isArray(v) ? v.length > 0 : Boolean(v))) ||
          searchQuery.trim(),
      ),
    [filters, searchQuery],
  );

  const filterCounts = useMemo<HomeFilterCounts>(() => {
    const zMapy = (mapa: Record<string, number>) => (value: string) => mapa[value] ?? 0;
    const region = zMapy(licznicy.region);
    const typ = zMapy(licznicy.type);
    const wiek = zMapy(licznicy.age);
    return {
      city: filterOptions.city.map((o) => ({ ...o, count: region(o.value) })),
      age: filterOptions.age.map((o) => ({ value: o.value, label: o.label, count: wiek(o.value) })),
      type: filterOptions.type.map((o) => ({ ...o, count: typ(o.value) })),
      // Wymiary ukryte w UI (isIndoor twardo false, cena i typ atrakcji bez danych)
      // — zostają w kształcie, żeby nie zmieniać kontraktu FilterBara.
      indoor: filterOptions.indoor.map((o) => ({ ...o, count: 0 })),
      activityKind: filterOptions.activityKind.map((o) => ({ ...o, count: 0 })),
      distance: [],
      price: filterOptions.price.map((o) => ({ ...o, count: 0 })),
      total: licznicy.total,
      filtered: licznicy.filtered,
      hasAnyFilter,
    };
  }, [licznicy, hasAnyFilter]);

  const hasMore = activities.length < licznicy.filtered;

  const loadMore = useCallback(() => {
    if (loading || loadingMore) return;
    setPage((p) => p + 1);
  }, [loading, loadingMore]);

  const refetch = useCallback(() => {
    setError(null);
    setZetonOdswiezenia((t) => t + 1);
  }, []);

  return { activities, filterCounts, loading, loadingMore, hasMore, error, loadMore, refetch };
}
