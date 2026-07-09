import { useEffect, useState } from "react";
import { catalogClient, mapCatalogRow, type CatalogRow } from "@/lib/catalogClient";
import type { Activity } from "@/data/activities";

export interface UseActivitiesFilters {
  region?: string;
  type?: string;
  page?: number;
  pageSize?: number;
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
  const { region, type, page = 0, pageSize = 24 } = filters;
  const [data, setData] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        let q = catalogClient
          .from("public_activities")
          .select("*", { count: "exact" })
          .eq("published", true)
          .order("rating", { ascending: false })
          .order("reviews_count", { ascending: false })
          .range(page * pageSize, page * pageSize + pageSize - 1);
        if (region) q = q.eq("region", region);
        if (type) q = q.eq("type", type);
        const { data: rows, count, error: err } = await q;
        if (err) throw err;
        if (cancelled) return;
        setData((rows as CatalogRow[] | null)?.map((r, i) => mapCatalogRow(r, i)) ?? []);
        setTotal(count ?? 0);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [region, type, page, pageSize]);

  return { data, total, loading, error };
}

/** Pobiera pojedynczą atrakcję po slug (dla strony szczegółów). */
export async function fetchActivityBySlug(slug: string): Promise<Activity | null> {
  const { data, error } = await catalogClient
    .from("public_activities")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapCatalogRow(data as CatalogRow);
}