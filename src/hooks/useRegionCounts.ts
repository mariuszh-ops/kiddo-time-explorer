// Liczby atrakcji per województwo — pobierane bez transferu wierszy przez
// `count: 'exact', head: true`. 16 lekkich HEAD-owych zapytań równolegle,
// wynik cache'owany w pamięci modułu (żyje na czas sesji karty).
import { useEffect, useState } from "react";
import { catalogClient } from "@/lib/catalogClient";
import { REGION_SLUGS } from "@/data/regions";

let CACHE: Record<string, number> | null = null;
let INFLIGHT: Promise<Record<string, number>> | null = null;

async function fetchAll(): Promise<Record<string, number>> {
  if (CACHE) return CACHE;
  if (INFLIGHT) return INFLIGHT;
  INFLIGHT = (async () => {
    const entries = await Promise.all(
      REGION_SLUGS.map(async (slug) => {
        const { count, error } = await catalogClient
          .from("public_activities")
          .select("place_id", { count: "exact", head: true })
          .eq("published", true)
          .eq("region", slug);
        if (error) return [slug, 0] as const;
        return [slug, count ?? 0] as const;
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

export function useRegionCounts(): { counts: Record<string, number>; loading: boolean } {
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