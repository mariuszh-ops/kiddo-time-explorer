import { useEffect, useState } from "react";
import { catalogClient, mapCatalogRow, type CatalogRow } from "@/lib/catalogClient";
import { buildListingQuery, listingFilterKey } from "@/lib/listingQuery";
import { readDeadline } from "@/lib/readDeadline";
import type { Activity } from "@/data/activities";

const QUERY_TIMEOUT_MS = 15000;


export interface UseActivitiesFilters {
  region?: string;
  type?: string;
  amenities?: string[];
  minRating?: number;
  sort?: "rating" | "reviews" | "name";
  page?: number;
  pageSize?: number;
  /** Gdy false, wyklucz atrakcje klasyfikowane automatycznie (uncertain=true). Domyślnie true. */
  includeUncertain?: boolean;
  /** Dolna granica wieku dziecka (włącznie). Rekordy z age_min/age_max=null są ukrywane. */
  ageMin?: number;
  /** Górna granica wieku dziecka (włącznie). */
  ageMax?: number;
  /** Gdy true, zawężaj do atrakcji z is_free=true. */
  onlyFree?: boolean;
  /** Fraza wyszukiwania — słowa AND, ta sama reguła co „/” (rpc ff_home_match, FMN-B92). */
  search?: string;
}

export interface UseActivitiesResult {
  data: Activity[];
  total: number;
  loading: boolean;
  error: Error | null;
}

/**
 * Server-side filtered/paginated catalog reader. Filtruje po `region` i `type`
 * bezpośrednio na Supabase, paginuje przez `.range()`, sortuje po ocenie.
 * Domyślny page size: 24. Licznik przez `count: 'exact', head: true`.
 */
export function useActivities(filters: UseActivitiesFilters = {}): UseActivitiesResult {
  const { page = 0, pageSize = 24 } = filters;
  // FMN-B92: zapytanie i klucz z `listingQuery.ts` — wcześniej ten hook miał
  // własną (czwartą) kopię reguły frazy `name/city ilike`.
  const filterKey = listingFilterKey(filters);
  const [data, setData] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    setLoading(true);
    setError(null);

    const failWithTimeout = () => {
      if (cancelled) return;
      cancelled = true;
      setError(new Error("Przekroczono czas oczekiwania na odpowiedź serwera."));
      setLoading(false);
    };

    (async () => {
      try {
        timeoutId = setTimeout(failWithTimeout, QUERY_TIMEOUT_MS);
        const { data: rows, count, error: err } = await buildListingQuery(filters, { withCount: true }).range(
          page * pageSize,
          page * pageSize + pageSize - 1,
        );
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (err) throw err;
        if (cancelled) return;
        setData((rows as unknown as CatalogRow[] | null)?.map((r, i) => mapCatalogRow(r, i)) ?? []);
        setTotal(count ?? 0);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
    // `filters` czytamy przez klucz — obiekt bywa nowy przy każdym renderze.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, page, pageSize]);

  return { data, total, loading, error };
}

/**
 * Pobiera pojedynczą atrakcję po slug (dla strony szczegółów).
 * `null` oznacza WYŁĄCZNIE „nie ma takiego wiersza" (pusta tablica z PostgREST).
 * Awaria (błąd, timeout, uszkodzone body) leci wyjątkiem, żeby karta pokazała
 * komunikat o błędzie zamiast udawać 404 (audyt: J-02).
 */
export async function fetchActivityBySlug(slug: string): Promise<Activity | null> {
  // GL-7-026: zawieszony serwer = blad po 10 s zamiast szkieletu ok. 67 s.
  const deadline = readDeadline();
  let data: unknown;
  try {
    const res = await catalogClient
      .from("public_activities")
      .select("*")
      .eq("slug", slug)
      .limit(1)
      .abortSignal(deadline.signal);
    if (res.error) throw res.error;
    data = res.data;
  } finally {
    deadline.clear();
  }
  // Poprawna odpowiedź to zawsze tablica. Cokolwiek innego (np. body `null`
  // z uszkodzonej odpowiedzi 200) to awaria, nie brak atrakcji.
  if (!Array.isArray(data)) throw new Error("Nieprawidłowa odpowiedź serwera katalogu");
  if (data.length === 0) return null;
  return mapCatalogRow(data[0] as CatalogRow);
}