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

  // FMN-B11 (trop 062): zapytanie, dla którego efekt pobierania już ruszył.
  const kluczEfektu = `${enabled}|${retryKey}|${kluczZapytania}|${kluczWidoku}`;
  const kluczOstatniegoEfektuRef = useRef<string | null>(null);

  const refetch = useCallback(() => {
    // Ponowienie po awarii musi naprawdę odpytać bazę, więc kasujemy ślad
    // po kadrach uznanych za pobrane.
    magazyn.current.kadry = [];
    setRetryKey((k) => k + 1);
  }, []);

  useEffect(() => {
    kluczOstatniegoEfektuRef.current = kluczEfektu;
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

  // FMN-B11 (trop 062): `loading` to stan ustawiany w efekcie, więc spóźnia się
  // o jeden render za nowym zapytaniem. Pierwszy kadr mapy (enabled: false -> true)
  // dawał render „kadr znany, 0 pinów, nie ładuje" — MapView brał to za prawdziwe
  // zero i przy CPU 4x na ok. 0,6 s pisał „0 atrakcji w widoku" i „Brak atrakcji
  // w tym obszarze" przed 307 pinami (FMN-1-062 krok 0, 1-2 na 8 wejść).
  // Dopóki efekt dla bieżącego zapytania nie ruszył, mówimy to, co on zaraz
  // ustawi: kadr już pobrany = nie ładuje, każdy inny = ładuje.
  let loadingTeraz = loading;
  if (kluczOstatniegoEfektuRef.current !== kluczEfektu) {
    const stan = magazyn.current;
    const pokryty =
      visible != null && stan.region === region && stan.kadry.some((k) => bboxContains(k, visible));
    loadingTeraz = enabled && !pokryty;
  }

  return { pins, loading: loadingTeraz, error, refetch };
}
