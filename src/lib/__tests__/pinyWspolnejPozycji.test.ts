import { describe, expect, it } from "vitest";
import { ODSTEP_PINOW_PX, przesunieciaPinow } from "@/lib/pinyWspolnejPozycji";

describe("FMN-B63: piny o identycznych współrzędnych rozsunięte na ekranie", () => {
  it("pin sam na swojej pozycji nie dostaje przesunięcia", () => {
    const w = przesunieciaPinow([
      { id: 1, latitude: 51.1, longitude: 17.0 },
      { id: 2, latitude: 51.1, longitude: 17.00001 },
    ]);
    expect(w.size).toBe(0);
  });

  it("trzy piny w jednym punkcie = rząd po id, środkowy na miejscu, sąsiedzi o odstęp szerszy niż pin", () => {
    const w = przesunieciaPinow([
      { id: 30, latitude: 51.0945455, longitude: 17.0196003 },
      { id: 10, latitude: 51.0945455, longitude: 17.0196003 },
      { id: 20, latitude: 51.0945455, longitude: 17.0196003 },
      { id: 99, latitude: 52.0, longitude: 21.0 },
    ]);
    expect(w.get(10)).toEqual([-ODSTEP_PINOW_PX, 0]);
    expect(w.get(20)).toEqual([0, 0]);
    expect(w.get(30)).toEqual([ODSTEP_PINOW_PX, 0]);
    expect(w.has(99)).toBe(false);
    // Zwykły pin ma 40 px, podświetlony 46: połowy szerokości sąsiadów nie mogą się nałożyć.
    expect(ODSTEP_PINOW_PX).toBeGreaterThan((40 + 46) / 2);
  });

  it("dwa piny: symetrycznie wokół punktu, wynik nie zależy od kolejności wejścia", () => {
    const a = przesunieciaPinow([
      { id: 5, latitude: 50.8783494, longitude: 20.6479962 },
      { id: 7, latitude: 50.8783494, longitude: 20.6479962 },
    ]);
    const b = przesunieciaPinow([
      { id: 7, latitude: 50.8783494, longitude: 20.6479962 },
      { id: 5, latitude: 50.8783494, longitude: 20.6479962 },
    ]);
    expect(a.get(5)).toEqual([-ODSTEP_PINOW_PX / 2, 0]);
    expect(a.get(7)).toEqual([ODSTEP_PINOW_PX / 2, 0]);
    expect([...b.entries()].sort()).toEqual([...a.entries()].sort());
  });
});
