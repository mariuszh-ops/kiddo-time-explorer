import { useEffect, useState } from "react";
import { catalogClient as supabase } from "@/lib/catalogClient";

export interface ActivityRatingAggregate {
  avg: number | null;
  count: number;
}

// Kilka komponentów na karcie atrakcji (sekcja ocen, sticky bar, JSON-LD) pyta
// o ten sam agregat. Bez wspólnego cache'u każde z nich strzelało własnym RPC.
// Klucz = activityId + refreshKey, więc po zapisie oceny nadal leci jedno świeże
// zapytanie, a nie jedno na komponent.
const cache = new Map<string, ActivityRatingAggregate>();
const inflight = new Map<string, Promise<ActivityRatingAggregate | null>>();

function fetchAggregate(key: string, activityId: number): Promise<ActivityRatingAggregate | null> {
  const existing = inflight.get(key);
  if (existing) return existing;
  const promise = (async () => {
    const { data, error } = await supabase.rpc("get_activity_rating", { activity_id: activityId });
    if (error || !data) return null;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    const aggregate: ActivityRatingAggregate = {
      avg: row.avg_rating != null ? Number(row.avg_rating) : null,
      count: Number(row.ratings_count ?? 0),
    };
    cache.set(key, aggregate);
    return aggregate;
  })().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}

/**
 * Agregat ocen rodziców dla atrakcji. RLS blokuje czytanie cudzych ocen,
 * dlatego korzystamy z RPC get_activity_rating (SECURITY DEFINER), które
 * zwraca WYŁĄCZNIE średnią i liczbę ocen — bez pojedynczych wierszy i user_id.
 */
export function useActivityRating(activityId: number, refreshKey?: unknown): ActivityRatingAggregate {
  const cacheKey = `${activityId}::${String(refreshKey ?? "")}`;
  const [aggregate, setAggregate] = useState<ActivityRatingAggregate>(
    () => cache.get(cacheKey) ?? { avg: null, count: 0 },
  );

  useEffect(() => {
    let cancelled = false;
    const cached = cache.get(cacheKey);
    if (cached) {
      setAggregate(cached);
      return;
    }
    void fetchAggregate(cacheKey, activityId).then((result) => {
      if (!cancelled && result) setAggregate(result);
    });
    return () => {
      cancelled = true;
    };
  }, [cacheKey, activityId]);

  return aggregate;
}
