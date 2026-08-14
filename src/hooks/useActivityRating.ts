import { useEffect, useState } from "react";
import { catalogClient as supabase } from "@/lib/catalogClient";

export interface ActivityRatingAggregate {
  avg: number | null;
  count: number;
}

/**
 * Agregat ocen rodziców dla atrakcji. RLS blokuje czytanie cudzych ocen,
 * dlatego korzystamy z RPC get_activity_rating (SECURITY DEFINER), które
 * zwraca WYŁĄCZNIE średnią i liczbę ocen — bez pojedynczych wierszy i user_id.
 */
export function useActivityRating(activityId: number, refreshKey?: unknown): ActivityRatingAggregate {
  const [aggregate, setAggregate] = useState<ActivityRatingAggregate>({ avg: null, count: 0 });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase.rpc("get_activity_rating", { activity_id: activityId });
      if (cancelled || error || !data) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return;
      setAggregate({
        avg: row.avg_rating != null ? Number(row.avg_rating) : null,
        count: Number(row.ratings_count ?? 0),
      });
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [activityId, refreshKey]);

  return aggregate;
}
