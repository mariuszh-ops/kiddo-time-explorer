// Zapytania punktowe zastępujące dawne czytanie całego katalogu z pamięci.
// - useTopActivities(limit): jeden SELECT z limitem (lekkie kolumny karty),
// - useCatalogTotal(): jeden count z head:true (zero transferu wierszy).
import { useEffect, useState } from "react";
import { catalogClient, mapCatalogRow, CARD_COLUMNS, type CatalogRow } from "@/lib/catalogClient";
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

let TOTAL_CACHE: number | null = null;
let TOTAL_INFLIGHT: Promise<number> | null = null;

async function fetchTotal(): Promise<number> {
  if (TOTAL_CACHE !== null) return TOTAL_CACHE;
  if (TOTAL_INFLIGHT) return TOTAL_INFLIGHT;
  TOTAL_INFLIGHT = (async () => {
    const { count, error } = await catalogClient
      .from("public_activities")
      .select("place_id", { count: "exact", head: true })
      .eq("published", true);
    if (error) throw error;
    TOTAL_CACHE = count ?? 0;
    return TOTAL_CACHE;
  })();
  try {
    return await TOTAL_INFLIGHT;
  } finally {
    TOTAL_INFLIGHT = null;
  }
}

export function useCatalogTotal(): number {
  const [total, setTotal] = useState<number>(TOTAL_CACHE ?? 0);

  useEffect(() => {
    if (TOTAL_CACHE !== null) return;
    let cancelled = false;
    fetchTotal()
      .then((n) => { if (!cancelled) setTotal(n); })
      .catch(() => { /* licznik jest ozdobny — brak wartości ukrywa napis */ });
    return () => { cancelled = true; };
  }, []);

  return total;
}