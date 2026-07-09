// Liczby atrakcji per kategoria (`type`) — analogicznie do useRegionCounts,
// bez transferu wierszy (count: 'exact', head: true).
import { useEffect, useState } from "react";
import { catalogClient } from "@/lib/catalogClient";
import { filterOptions } from "@/data/activities";

let CACHE: Record<string, number> | null = null;
let INFLIGHT: Promise<Record<string, number>> | null = null;

async function fetchAll(): Promise<Record<string, number>> {
  if (CACHE) return CACHE;
  if (INFLIGHT) return INFLIGHT;
  INFLIGHT = (async () => {
    const entries = await Promise.all(
      filterOptions.type.map(async ({ value }) => {
        const { count, error } = await catalogClient
          .from("public_activities")
          .select("place_id", { count: "exact", head: true })
          .eq("published", true)
          .eq("type", value);
        if (error) return [value, 0] as const;
        return [value, count ?? 0] as const;
      }),
    );
    CACHE = Object.fromEntries(entries);
    return CACHE;
  })();
  try {
    return await INFLIGHT;
  } finally {
    INFLIGHT = null;
  }
}

export function useTypeCounts(): { counts: Record<string, number>; loading: boolean } {
  const [counts, setCounts] = useState<Record<string, number>>(CACHE ?? {});
  const [loading, setLoading] = useState(!CACHE);

  useEffect(() => {
    if (CACHE) return;
    let cancelled = false;
    fetchAll()
      .then((c) => { if (!cancelled) { setCounts(c); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { counts, loading };
}