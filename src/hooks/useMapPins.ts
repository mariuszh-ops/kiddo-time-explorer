import { useEffect, useState } from "react";
import { fetchMapPins } from "@/lib/mapPins";
import type { Activity } from "@/data/activities";

/**
 * Piny mapy z jednego wywołania rpc('get_map_pins').
 * `enabled=false` → nic nie pobieramy (np. gdy widok mapy dostaje już
 * przefiltrowaną listę z katalogu).
 */
export function useMapPins(enabled = true) {
  const [pins, setPins] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchMapPins()
      .then((data) => {
        if (!cancelled) {
          setPins(data);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { pins, loading, error };
}
