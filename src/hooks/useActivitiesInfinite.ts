import { useEffect, useRef, useState } from "react";
import { catalogClient, mapCatalogRow, type CatalogRow } from "@/lib/catalogClient";
import type { Activity } from "@/data/activities";
import type { UseActivitiesFilters } from "@/hooks/useActivities";

export interface UseActivitiesInfiniteResult {
  data: Activity[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => void;
}

/**
 * Serwerowa paginacja z akumulacją stron. Domyślnie 24 rekordy per strona
 * (`.range()` w Supabase, `count: 'exact'` tylko przy pierwszej stronie).
 * Zmiana filtrów resetuje stronę i akumulację.
 */
export function useActivitiesInfinite(
  filters: Omit<UseActivitiesFilters, "page" | "pageSize"> = {},
  pageSize = 24,
): UseActivitiesInfiniteResult {
  const { region, type, amenities, minRating, sort = "rating" } = filters;
  const amenitiesKey = amenities?.join(",") ?? "";
  const filterKey = JSON.stringify({ region, type, amenitiesKey, minRating, sort });

  const [data, setData] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const activeKey = useRef(filterKey);

  // Reset kiedy zmieniają się filtry
  useEffect(() => {
    activeKey.current = filterKey;
    setPage(0);
    setData([]);
    setTotal(0);
    setError(null);
    setLoading(true);
  }, [filterKey]);

  useEffect(() => {
    let cancelled = false;
    const keyAtStart = filterKey;
    (async () => {
      try {
        if (page > 0) setLoadingMore(true);
        let q = catalogClient
          .from("public_activities")
          .select("*", page === 0 ? { count: "exact" } : {})
          .eq("published", true);
        if (region) q = q.eq("region", region);
        if (type) q = q.eq("type", type);
        if (amenities && amenities.length > 0) q = q.contains("amenities", amenities);
        if (typeof minRating === "number" && minRating > 0) q = q.gte("rating", minRating);
        if (sort === "name") q = q.order("name", { ascending: true });
        else if (sort === "reviews")
          q = q.order("reviews_count", { ascending: false, nullsFirst: false })
               .order("rating", { ascending: false, nullsFirst: false });
        else
          q = q.order("rating", { ascending: false, nullsFirst: false })
               .order("reviews_count", { ascending: false, nullsFirst: false });
        q = q.range(page * pageSize, page * pageSize + pageSize - 1);

        const { data: rows, count, error: err } = await q;
        if (err) throw err;
        if (cancelled || activeKey.current !== keyAtStart) return;
        const mapped = (rows as CatalogRow[] | null)?.map((r, i) => mapCatalogRow(r, page * pageSize + i)) ?? [];
        setData((prev) => (page === 0 ? mapped : [...prev, ...mapped]));
        if (page === 0 && typeof count === "number") setTotal(count);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [filterKey, page, pageSize, region, type, amenitiesKey, minRating, sort]);

  const hasMore = data.length < total;
  const loadMore = () => {
    if (!loading && !loadingMore && hasMore) setPage((p) => p + 1);
  };

  return { data, total, loading, loadingMore, hasMore, error, loadMore };
}