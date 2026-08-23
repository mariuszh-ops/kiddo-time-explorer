// Zapytania punktowe zastępujące dawne czytanie całego katalogu z pamięci.
// - useTopActivities(limit): jeden SELECT z limitem (lekkie kolumny karty),
// - useCatalogTotal(): jeden count z head:true (zero transferu wierszy).
import { useEffect, useMemo, useState } from "react";
import { catalogClient, mapCatalogRow, CARD_COLUMNS, type CatalogRow } from "@/lib/catalogClient";
import { useHomeCounts } from "@/hooks/useHomeCounts";
import type { Activity } from "@/data/activities";

const MAX_TOP = 12;

let TOP_CACHE: Activity[] | null = null;
let TOP_INFLIGHT: Promise<Activity[]> | null = null;

async function fetchTop(): Promise<Activity[]> {
  if (TOP_CACHE) return TOP_CACHE;
  if (TOP_INFLIGHT) return TOP_INFLIGHT;
  TOP_INFLIGHT = (async () => {
    const { data, error } = await catalogClient
      .from("public_activities")
      .select(CARD_COLUMNS)
      .eq("published", true)
      .order("rating", { ascending: false })
      .order("reviews_count", { ascending: false })
      .limit(MAX_TOP);
    if (error) throw error;
    TOP_CACHE = ((data ?? []) as unknown as CatalogRow[]).map((row, i) => mapCatalogRow(row, i));
    return TOP_CACHE;
  })();
  try {
    return await TOP_INFLIGHT;
  } finally {
    TOP_INFLIGHT = null;
  }
}

export function useTopActivities(limit = MAX_TOP): { activities: Activity[]; loading: boolean } {
  const [activities, setActivities] = useState<Activity[]>(TOP_CACHE ?? []);
  const [loading, setLoading] = useState(!TOP_CACHE);

  useEffect(() => {
    if (TOP_CACHE) return;
    let cancelled = false;
    fetchTop()
      .then((rows) => { if (!cancelled) { setActivities(rows); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { activities: activities.slice(0, limit), loading };
}

/**
 * Łączna liczba opublikowanych atrakcji — liczona z rpc('get_home_counts')
 * (te same dane, które i tak pobiera home), więc bez dodatkowego zapytania
 * `count/head` do public_activities (odpowiedzi 206).
 */
export function useCatalogTotal(): number {
  const { counts } = useHomeCounts();
  return useMemo(
    () => Object.values(counts.regions).reduce<number>((sum, n) => sum + (Number(n) || 0), 0),
    [counts],
  );
}
