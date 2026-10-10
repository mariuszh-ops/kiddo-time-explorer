import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { renderHook, act } from "@testing-library/react";

/**
 * INP (A1000-P, chip wieku): liczba kolumn siatki z `matchMedia` zamiast
 * `window.innerWidth` (getter wymuszał layout w efekcie montażu siatki).
 * Te same progi co klasy siatki: sm 640 → 2, md 768 → 3, lg 1024 → 4.
 */
let szerokosc = 390;
const sluchacze = new Map<string, Set<() => void>>();
const pasuje = (q: string) => szerokosc >= Number(/min-width:\s*(\d+)px/.exec(q)?.[1] ?? 0);
const pierwotne = window.matchMedia;

const ustawSzerokosc = (w: number) => {
  const przed = new Map([...sluchacze.keys()].map((q) => [q, pasuje(q)]));
  szerokosc = w;
  for (const [q, zbior] of sluchacze) if (przed.get(q) !== pasuje(q)) zbior.forEach((f) => f());
};

beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    media: query,
    get matches() {
      return pasuje(query);
    },
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: (_: string, f: () => void) => {
      if (!sluchacze.has(query)) sluchacze.set(query, new Set());
      sluchacze.get(query)!.add(f);
    },
    removeEventListener: (_: string, f: () => void) => sluchacze.get(query)?.delete(f),
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});
afterAll(() => {
  window.matchMedia = pierwotne;
});

describe("useGridCols — kolumny siatki z media queries", () => {
  it("progi Tailwinda: 390 → 1, 640 → 2, 768 → 3, 1024 → 4, 1440 → 4", async () => {
    const { getGridCols } = await import("@/hooks/useGridCols");
    const wynik = [390, 639, 640, 767, 768, 1023, 1024, 1440].map((w) => {
      szerokosc = w;
      return getGridCols();
    });
    expect(wynik).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it("pierwszy render ma właściwą wartość i śledzi zmianę rozmiaru okna", async () => {
    const { useGridCols } = await import("@/hooks/useGridCols");
    szerokosc = 390;
    const { result } = renderHook(() => useGridCols());
    expect(result.current).toBe(1);
    act(() => ustawSzerokosc(1024));
    expect(result.current).toBe(4);
    act(() => ustawSzerokosc(768));
    expect(result.current).toBe(3);
    act(() => ustawSzerokosc(640));
    expect(result.current).toBe(2);
  });
});
