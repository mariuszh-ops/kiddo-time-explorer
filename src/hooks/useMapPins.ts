import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { bboxContains, fetchMapPins, mapPinsKey, type MapBbox, type MapPinsQuery } from "@/lib/mapPins";
import type { Activity } from "@/data/activities";

/** Kadr obejmujący cały świat — znacznik „pobrano komplet, nie ma czego dociągać”. */
const CALY_SWIAT: MapBbox = { minLat: -90, maxLat: 90, minLng: -180, maxLng: 180 };

/**
 * Piny mapy z rpc('get_map_pins').
 * `enabled=false` → nic nie pobieramy (np. gdy widok mapy dostaje już
 * przefiltrowaną listę z katalogu).
 *
 * F-17: `query` zawęża zapytanie do województwa i/lub kadru mapy. Wyniki
 * kolejnych kadrów KUMULUJEMY po slugu — po oddaleniu albo przesunięciu mapy
 * piny raz pobrane zostają, a zapytanie leci tylko po to, czego jeszcze nie ma.
 * Kadr zawarty w którymkolwiek już pobranym nie generuje zapytania w ogóle.
 * Zmiana województwa czyści kumulację (inny zbiór bazowy).
 */
export function useMapPins(enabled = true, query?: MapPinsQuery) {
  const region = query?.region ?? null;
  const bbox = query?.bbox ?? null;
  // Do testu pokrycia bierzemy kadr widoczny; jeśli go nie podano — kadr pobierania.
  const visible = query?.visible ?? bbox;
  // Klucz zapytania stabilizuje efekt: nowy obiekt kadru o tych samych
  // współrzędnych nie ma prawa odpalić kolejnej rundy pobierania.
  const kluczZapytania = useMemo(() => mapPinsKey({ region, bbox }), [region, bbox]);
  const kluczWidoku = useMemo(() => mapPinsKey({ region, bbox: visible }), [region, visible]);

  const [pins, setPins] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const magazyn = useRef<{ region: string | null; bySlug: Map<string, Activity>; kadry: MapBbox[] }>({
    region: null,
    bySlug: new Map(),
    kadry: [],
  });

  const refetch = useCallback(() => {
    // Ponowienie po awarii musi naprawdę odpytać bazę, więc kasujemy ślad
    // po kadrach uznanych za pobrane.
    magazyn.current.kadry = [];
    setRetryKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const stan = magazyn.current;
    if (stan.region !== region) {
      stan.region = region;
      stan.bySlug = new Map();
      stan.kadry = [];
    }
    // To, co widać, mieści się w już pobranym kadrze — zero zapytań.
    if (visible && stan.kadry.some((k) => bboxContains(k, visible))) {
      setPins(Array.from(stan.bySlug.values()));
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMapPins({ region, bbox })
      .then((data) => {
        if (cancelled) return;
        for (const p of data) stan.bySlug.set(p.slug, p);
        // Bez kadru odpowiedź jest kompletna dla tego regionu.
        stan.kadry.push(bbox ?? CALY_SWIAT);
        setPins(Array.from(stan.bySlug.values()));
        setError(null);
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
    // `kluczZapytania` domyka region + kadr; bbox/region są z niego wyliczone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, retryKey, kluczZapytania, kluczWidoku]);

  return { pins, loading, error, refetch };
}
