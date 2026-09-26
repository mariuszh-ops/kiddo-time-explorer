import { useCallback, useEffect, useRef, useState } from "react";
import { mapCatalogRow, type CatalogRow } from "@/lib/catalogClient";
import { sanitizeSearchTerm } from "@/lib/searchConfig";
import {
  buildListingQuery,
  listingFilterKey,
  takeEarlyListing,
  LISTING_PAGE_SIZE,
} from "@/lib/listingQuery";
import type { Activity } from "@/data/activities";
import type { UseActivitiesFilters } from "@/hooks/useActivities";

const QUERY_TIMEOUT_MS = 15000;
/**
 * Odbudowa kilku stron naraz (FMN-B21: "wstecz" z karty albo F5 po "Pokaż więcej")
 * idzie kawałkami po 8 stron — jedno .range() na setki wierszy ryzykowałoby
 * cichym ucięciem odpowiedzi przez limit wierszy PostgREST.
 */
const MAX_WIERSZY_NA_ZAPYTANIE = 192;

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
  /** Numer strony, od której zaczyna się lista (0, chyba że wejście z ?page=N). */
  firstPage: number;
  /**
   * Skok na wskazaną stronę jako NOWY punkt wejścia (klik w numer w paginacji
   * SEO albo ?page= zmienione z zewnątrz). Pobiera wyłącznie swoje `pageSize`
   * rekordów — inaczej niż `loadMore`, które dokleja kolejną porcję.
   * `pageCount` > 1 odbudowuje od razu strony page..page+pageCount-1
   * („wstecz" na wpis historii zapisany przez „Pokaż więcej").
   */
  goToPage: (page: number, pageCount?: number) => void;
  /** Ponawia bieżące zapytanie (bez przeładowania strony). */
  refetch: () => void;
}

/**
 * Serwerowa paginacja. Strona N pobiera dokładnie swoje `pageSize` rekordów
 * (`?page=N` to punkt wejścia, nie kumulacja 1..N). Domyślnie 24 rekordy per strona
 * (`.range()` w Supabase, `count: 'exact'` tylko przy pierwszej stronie).
 * Wyjątek: `initialPageCount` / `goToPage(p, n)` odbudowują od razu kilka stron,
 * które użytkownik już miał doładowane „Pokaż więcej" (FMN-B21).
 * Zmiana filtrów resetuje stronę i akumulację.
 */
export function useActivitiesInfinite(
  filters: Omit<UseActivitiesFilters, "page" | "pageSize"> = {},
  pageSize = LISTING_PAGE_SIZE,
  /** Pierwsza strona listy przy montażu (wejście z ?page=N → N-1). */
  initialPage = 0,
  /**
   * FMN-B21: ile kolejnych stron od `initialPage` wczytać od razu przy montażu.
   * > 1 tylko przy odbudowie listy doładowanej „Pokaż więcej" („wstecz" z karty,
   * F5) — zwykłe wejście z ?page=N to JEDNA strona N (paginacja SEO, K-03).
   */
  initialPageCount = 1,
): UseActivitiesInfiniteResult {
  const { region, type, amenities, minRating, sort = "reviews", includeUncertain = true, ageMin, ageMax, onlyFree, search } = filters;
  const amenitiesKey = amenities?.join(",") ?? "";
  const searchTerm = sanitizeSearchTerm(search ?? "");
  // Klucz liczy `listingQuery.ts` — tym samym wzorem, z ktorego korzysta wczesny
  // start zapytania. Rozjazd tych dwoch klucza = ciche podwojne zapytanie.
  const filterKey = listingFilterKey(filters);

  const [data, setData] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  // Strona startowa czytana raz — późniejsze zmiany URL nie resetują listy.
  const initialPageRef = useRef(Math.max(0, Math.floor(initialPage)));
  // Ostatnia strona, którą przynosi pierwsze zapytanie (= initialPage przy zwykłym wejściu).
  const initialLastPageRef = useRef(initialPageRef.current + Math.max(1, Math.floor(initialPageCount)) - 1);
  // Klucz filtrów, dla którego strona startowa jeszcze obowiązuje.
  const initialFilterKeyRef = useRef(filterKey);
  // Po pierwszej zmianie filtrów strona startowa jest „zużyta” — resety idą na 0.
  const startPageActiveRef = useRef(true);
  const [page, setPage] = useState(initialLastPageRef.current);
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
    setPage(startPageActiveRef.current ? initialLastPageRef.current : 0);
    setData([]);
    setTotal(0);
    setError(null);
    setLoading(true);
  }, [filterKey]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const keyAtStart = filterKey;
    // Pierwszy fetch dla klucza filtrów pobiera strony startPage..startLastPage
    // (zwykle jedną; kilka przy odbudowie „Pokaż więcej" po „wstecz"/F5 — FMN-B21).
    const startPage = startPageActiveRef.current ? initialPageRef.current : 0;
    const startLastPage = startPageActiveRef.current ? initialLastPageRef.current : 0;
    const isInitialFetch = page === startLastPage;
    // Poza odbudową każda strona pobiera WYŁĄCZNIE swoje `pageSize` pozycji —
    // ?page=N to nie kumulacja 1..N. „Pokaż więcej" dokleja kolejne porcje.
    const from = (isInitialFetch ? startPage : page) * pageSize;
    const to = page * pageSize + pageSize - 1;


    const failWithTimeout = () => {
      if (cancelled) return;
      cancelled = true;
      setError(new Error("Przekroczono czas oczekiwania na odpowiedź serwera."));
      setLoading(false);
      setLoadingMore(false);
    };

    const buildQuery = (headOnly: boolean, withCount = false) =>
      buildListingQuery(
        { region, type, amenities, minRating, sort, includeUncertain, ageMin, ageMax, onlyFree, search },
        { headOnly, withCount: !headOnly && withCount },
      );

    (async () => {
      try {
        if (!isInitialFetch) setLoadingMore(true);
        else setLoading(true);
        timeoutId = setTimeout(failWithTimeout, QUERY_TIMEOUT_MS);

        // Wejście z ?page=N poza zakresem → policz wyniki i cofnij na ostatnią REALNĄ stronę.
        if (isInitialFetch && page > 0) {
          const { count: headCount, error: headErr } = await buildQuery(true);
          if (headErr) throw headErr;
          if (cancelled || activeKey.current !== keyAtStart) return;
          const totalRows = headCount ?? 0;
          if (totalRows === 0) {
            setData([]);
            setTotal(0);
            return;
          }
          const lastPage = Math.ceil(totalRows / pageSize) - 1;
          if (page > lastPage) {
            setTotal(totalRows);
            initialPageRef.current = Math.min(startPage, lastPage);
            initialLastPageRef.current = lastPage;
            setPage(lastPage);
            return;
          }
        }

        // A1000-P bloker 2: pierwsza strona czystego listingu zostala wystartowana
        // z modulu wejsciowego (`earlyListingStart.ts`), zanim zamontowal sie React —
        // tutaj tylko odbieramy jej wynik. `null` = nic nie czeka (inne filtry,
        // inna strona, wynik sie zestarzal) i lecimy normalnym zapytaniem.
        const wczesny =
          isInitialFetch && from === 0 && to === pageSize - 1
            ? takeEarlyListing(filterKey, 0)
            : null;
        const rows: CatalogRow[] = [];
        let count: number | null = null;
        for (let od = from; od <= to; od += MAX_WIERSZY_NA_ZAPYTANIE) {
          const pierwszyKawalek = od === from;
          const doWiersza = Math.min(to, od + MAX_WIERSZY_NA_ZAPYTANIE - 1);
          const { data: porcja, count: licznik, error: err } = await ((pierwszyKawalek ? wczesny : null) ??
            buildQuery(false, isInitialFetch && pierwszyKawalek).range(od, doWiersza));
          if (err) throw err;
          if (cancelled || activeKey.current !== keyAtStart) return;
          if (pierwszyKawalek) count = licznik;
          const wiersze = (porcja as unknown as CatalogRow[] | null) ?? [];
          rows.push(...wiersze);
          if (wiersze.length < doWiersza - od + 1) break;
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        const mapped = rows.map((r, i) => mapCatalogRow(r, from + i));
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

  // Offset pierwszej pobranej porcji (przy wejściu z ?page=N lista zaczyna się od N-tej strony).
  const startOffset = (startPageActiveRef.current ? initialPageRef.current : 0) * pageSize;
  const hasMore = startOffset + data.length < total;
  const loadMore = () => {
    if (!loading && !loadingMore && hasMore) setPage((p) => p + 1);
  };
  const refetch = () => {
    setError(null);
    setLoading(true);
    setReloadToken((t) => t + 1);
  };
  const goToPage = useCallback((next: number, pageCount = 1) => {
    const target = Math.max(0, Math.floor(next));
    const last = target + Math.max(1, Math.floor(pageCount)) - 1;
    // Nowy punkt wejścia: strona startowa przesuwa się na `target`, więc
    // najbliższy fetch jest „initial" (zamiana danych + świeży count),
    // a nie doklejeniem porcji jak przy „Pokaż więcej".
    initialPageRef.current = target;
    initialLastPageRef.current = last;
    startPageActiveRef.current = true;
    setData([]);
    setError(null);
    setLoading(true);
    setPage(last);
    // Ta sama ostatnia strona co teraz (inny początek) nie zmieni `page` —
    // bez żetonu zapytanie by nie ruszyło, a lista wisiałaby pusta w „loading".
    setReloadToken((t) => t + 1);
  }, []);

  return {
    data,
    total,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    page,
    firstPage: startOffset / pageSize,
    refetch,
    goToPage,
  };
}