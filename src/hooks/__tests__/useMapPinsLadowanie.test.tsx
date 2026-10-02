import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useLayoutEffect } from "react";
import type { MapBbox, MapPinsQuery } from "@/lib/mapPins";

/**
 * FMN-B11 (trop 062): pierwszy kadr mapy bez filtrów (enabled: false -> true)
 * nie może dać renderu „kadr znany, 0 pinów, nie ładuje". MapView bierze taki
 * render za prawdziwe zero: przy CPU 4x na ok. 0,6 s „0 atrakcji w widoku"
 * i „Brak atrakcji w tym obszarze" przed 307 pinami (FMN-1-062 krok 0).
 * Test zapisuje stan KAŻDEGO zatwierdzonego renderu (to, co widzi MapView).
 */
const { stan } = vi.hoisted(() => ({
  stan: { wywolania: 0, zwolnij: [] as Array<() => void> },
}));

const PIN = { id: 1, slug: "a", latitude: 52.2, longitude: 21.0 };

vi.mock("@/lib/mapPins", async (oryginal) => {
  const prawdziwy = await oryginal<typeof import("@/lib/mapPins")>();
  return {
    ...prawdziwy,
    fetchMapPins: () => {
      stan.wywolania += 1;
      return new Promise((r) => stan.zwolnij.push(() => r([PIN])));
    },
  };
});

import { useMapPins } from "@/hooks/useMapPins";

const DUZY: MapBbox = { minLat: 51, maxLat: 53, minLng: 20, maxLng: 22 };
const MALY: MapBbox = { minLat: 52, maxLat: 52.5, minLng: 20.5, maxLng: 21.5 };

interface Klatka {
  piny: number;
  laduje: boolean;
}

function renderujZKlatkami(initialProps: { enabled: boolean; query?: MapPinsQuery }) {
  const klatki: Klatka[] = [];
  const wynik = renderHook(
    ({ enabled, query }: { enabled: boolean; query?: MapPinsQuery }) => {
      const r = useMapPins(enabled, query);
      useLayoutEffect(() => {
        klatki.push({ piny: r.pins.length, laduje: r.loading });
      });
      return r;
    },
    { initialProps },
  );
  return { ...wynik, klatki };
}

describe("useMapPins: loading bez spóźnienia za nowym kadrem (FMN-B11 trop 062)", () => {
  it("pierwszy kadr: od pierwszego renderu z kadrem do odpowiedzi każda klatka mówi „ładuje”", async () => {
    stan.zwolnij = [];
    const { rerender, klatki } = renderujZKlatkami({ enabled: false });
    const odKadru = klatki.length;
    rerender({ enabled: true, query: { bbox: DUZY, visible: MALY } });
    const przedOdpowiedzia = klatki.slice(odKadru);
    expect(przedOdpowiedzia.length).toBeGreaterThan(0);
    // Na starym kodzie pierwsza klatka z kadrem to { piny: 0, laduje: false }.
    expect(przedOdpowiedzia.filter((k) => k.piny === 0 && !k.laduje)).toEqual([]);
    await act(async () => {
      stan.zwolnij.forEach((z) => z());
    });
    expect(klatki[klatki.length - 1]).toEqual({ piny: 1, laduje: false });
  });

  it("kadr już pobrany: przesunięcie w jego obrębie nie zapala „ładuje” i nie pyta bazy", async () => {
    stan.zwolnij = [];
    const { rerender, klatki } = renderujZKlatkami({ enabled: true, query: { bbox: DUZY, visible: DUZY } });
    await act(async () => {
      stan.zwolnij.forEach((z) => z());
    });
    const wywolaniaPrzed = stan.wywolania;
    const odPrzesuniecia = klatki.length;
    rerender({ enabled: true, query: { bbox: { ...DUZY, minLat: 50.9 }, visible: MALY } });
    expect(klatki.slice(odPrzesuniecia).filter((k) => k.laduje)).toEqual([]);
    expect(stan.wywolania).toBe(wywolaniaPrzed);
  });
});
