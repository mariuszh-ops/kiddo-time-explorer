import { useEffect, useRef, useState } from "react";
import { catalogClient, mapCatalogRow, CARD_COLUMNS, type CatalogRow } from "@/lib/catalogClient";
import { sanitizeSearchTerm } from "@/lib/searchConfig";
import type { Activity } from "@/data/activities";
import type { UseActivitiesFilters } from "@/hooks/useActivities";

const QUERY_TIMEOUT_MS = 15000;


export interface UseActivitiesInfiniteResult {
  data: Activity[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => void;
  /** Numer ostatnio doładowanej strony (0 = pierwsza). */
  page: number;
  /** Ponawia bieżące zapytanie (bez przeładowania strony). */
  refetch: () => void;
}

/**
 * Serwerowa paginacja. Strona N pobiera dokładnie swoje `pageSize` rekordów
 * (`?page=N` to punkt wejścia, nie kumulacja 1..N). Domyślnie 24 rekordy per strona
 * (`.range()` w Supabase, `count: 'exact'` tylko przy pierwszej stronie).
 * Zmiana filtrów resetuje stronę i akumulację.
 */
export function useActivitiesInfinite(
  filters: Omit<UseActivitiesFilters, "page" | "pageSize"> = {},
  pageSize = 24,
  /** Strona startowa (przywracana z URL po powrocie z karty atrakcji). */
  initialPage = 0,
): UseActivitiesInfiniteResult {
  const { region, type, amenities, minRating, sort = "reviews", includeUncertain = true, ageMin, ageMax, onlyFree, search } = filters;
  const amenitiesKey = amenities?.join(",") ?? "";
  const searchTerm = sanitizeSearchTerm(search ?? "");
  const filterKey = JSON.stringify({ region, type, amenitiesKey, minRating, sort, includeUncertain, ageMin, ageMax, onlyFree, searchTerm });

  const [data, setData] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  // Strona startowa czytana raz — późniejsze zmiany URL nie resetują listy.
  const initialPageRef = useRef(Math.max(0, initialPage));
  // Klucz filtrów, dla którego strona startowa jeszcze obowiązuje.
  const initialFilterKeyRef = useRef(filterKey);
  // Po pierwszej zmianie filtrów strona startowa jest „zużyta” — resety idą na 0.
  const startPageActiveRef = useRef(true);
  const [page, setPage] = useState(initialPageRef.current);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const activeKey = useRef(filterKey);
  const [reloadToken, setReloadToken] = useState(0);

  // Reset kiedy zmieniają się filtry
  useEffect(() => {
    activeKey.current = filterKey;
    if (filterKey !== initialFilterKeyRef.current) {
      startPageActiveRef.current = false;
    }
    setPage(startPageActiveRef.current ? initialPageRef.current : 0);
    setData([]);
    setTotal(0);
    setError(null);
    setLoading(true);
  }, [filterKey]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const keyAtStart = filterKey;
    // Pierwszy fetch po zmianie filtrów pobiera wszystkie strony do `page`
    // (przywrócenie stanu „Pokaż więcej" po powrocie wstecz).
    const startPage = startPageActiveRef.current ? initialPageRef.current : 0;
    const isInitialFetch = page === startPage;
    // Każda strona pobiera WYŁĄCZNIE swoje `pageSize` pozycji — brak kumulacji
    // stron 1..N (dawny sufit 504 wierszy). „Pokaż więcej" dokleja kolejne porcje.
    const from = page * pageSize;
    const to = page * pageSize + pageSize - 1;


    const failWithTimeout = () => {
      if (cancelled) return;
      cancelled = true;
      setError(new Error("Przekroczono czas oczekiwania na odpowiedź serwera."));
      setLoading(false);
      setLoadingMore(false);
    };

    (async () => {
      try {
        if (!isInitialFetch) setLoadingMore(true);
        else setLoading(true);
        timeoutId = setTimeout(failWithTimeout, QUERY_TIMEOUT_MS);
        let q = catalogClient
          .from("public_activities")
          .select(CARD_COLUMNS, isInitialFetch ? { count: "exact" } : {})
          .eq("published", true);
        if (region) q = q.eq("region", region);
        if (type) q = q.eq("type", type);
        if (amenities && amenities.length > 0) q = q.contains("amenities", JSON.stringify(amenities));
        if (typeof minRating === "number" && minRating > 0) q = q.gte("rating", minRating);
        if (!includeUncertain) q = q.eq("uncertain", false);
        if (onlyFree) q = q.eq("is_free", true);
        if (searchTerm.length >= 2) {
          q = q.or(`name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`);
        }
        // Zakres wieku [ageMin, ageMax] — przecinanie przedziałów. Rekordy null → ukryte.
        if (typeof ageMin === "number" && typeof ageMax === "number") {
          q = q.lte("age_min", ageMax).gte("age_max", ageMin);
        }
        if (sort === "name") q = q.order("name", { ascending: true });
        else if (sort === "reviews")
          q = q.order("reviews_count", { ascending: false, nullsFirst: false })
               .order("rating", { ascending: false, nullsFirst: false });
        else
          q = q.order("rating", { ascending: false, nullsFirst: false })
               .order("reviews_count", { ascending: false, nullsFirst: false });
        q = q.range(from, to);

        const { data: rows, count, error: err } = await q;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (err) throw err;
        if (cancelled || activeKey.current !== keyAtStart) return;
        const mapped = (rows as unknown as CatalogRow[] | null)?.map((r, i) => mapCatalogRow(r, from + i)) ?? [];
        setData((prev) => (isInitialFetch ? mapped : [...prev, ...mapped]));
        if (isInitialFetch && typeof count === "number") setTotal(count);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (!cancelled) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [filterKey, page, pageSize, region, type, amenitiesKey, minRating, sort, includeUncertain, ageMin, ageMax, onlyFree, searchTerm, reloadToken]);

  const hasMore = initialPageRef.current * pageSize + data.length < total || (!startPageActiveRef.current && data.length < total);
  const loadMore = () => {
    if (!loading && !loadingMore && hasMore) setPage((p) => p + 1);
  };
  const refetch = () => {
    setError(null);
    setLoading(true);
    setReloadToken((t) => t + 1);
  };

  return { data, total, loading, loadingMore, hasMore, error, loadMore, page, refetch };
}