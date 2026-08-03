// Liczniki atrakcji na stronie głównej — JEDNO zapytanie.
// Preferowane: rpc('get_home_counts') zwracające wiersze
//   { region text|null, type text|null, cnt bigint }
// zbudowane przez GROUP BY GROUPING SETS ((region), (type)).
// Fallback (gdy RPC nie istnieje/nie zadziała): lekkie zapytania
// { count: 'exact', head: true } — bez transferu wierszy.
import { useEffect, useState } from "react";
import { catalogClient } from "@/lib/catalogClient";
import { REGION_SLUGS } from "@/data/regions";
import { filterOptions } from "@/data/activities";

export interface HomeCounts {
  regions: Record<string, number>;
  types: Record<string, number>;
}

let CACHE: HomeCounts | null = null;
let INFLIGHT: Promise<HomeCounts> | null = null;

type CountRow = { region: string | null; type: string | null; cnt: number | string | null };

async function viaRpc(): Promise<HomeCounts | null> {
  const { data, error } = await catalogClient.rpc("get_home_counts");
  if (error || !Array.isArray(data)) return null;
  const regions: Record<string, number> = {};
  const types: Record<string, number> = {};
  for (const row of data as CountRow[]) {
    const n = Number(row?.cnt ?? 0);
    if (row?.region) regions[row.region] = n;
    else if (row?.type) types[row.type] = n;
  }
  if (!Object.keys(regions).length && !Object.keys(types).length) return null;
  return { regions, types };
}

async function viaHeadCounts(): Promise<HomeCounts> {
  const headCount = async (column: "region" | "type", value: string) => {
    const { count, error } = await catalogClient
      .from("public_activities")
      .select("place_id", { count: "exact", head: true })
      .eq("published", true)
      .eq(column, value);
    return [value, error ? 0 : count ?? 0] as const;
  };
  const [regionEntries, typeEntries] = await Promise.all([
    Promise.all(REGION_SLUGS.map((slug) => headCount("region", slug))),
    Promise.all(filterOptions.type.map(({ value }) => headCount("type", value))),
  ]);
  return {
    regions: Object.fromEntries(regionEntries),
    types: Object.fromEntries(typeEntries),
  };
}

async function fetchCounts(): Promise<HomeCounts> {
  if (CACHE) return CACHE;
  if (INFLIGHT) return INFLIGHT;
  INFLIGHT = (async () => {
    let result: HomeCounts | null = null;
    try {
      result = await viaRpc();
    } catch {
      result = null;
    }
    if (!result) result = await viaHeadCounts();
    CACHE = result;
    return result;
  })();
  try {
    return await INFLIGHT;
  } finally {
    INFLIGHT = null;
  }
}

export function useHomeCounts(): { counts: HomeCounts; loading: boolean } {
  const [counts, setCounts] = useState<HomeCounts>(CACHE ?? { regions: {}, types: {} });
  const [loading, setLoading] = useState(!CACHE);

  useEffect(() => {
    if (CACHE) return;
    let cancelled = false;
    fetchCounts()
      .then((c) => { if (!cancelled) { setCounts(c); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { counts, loading };
}
