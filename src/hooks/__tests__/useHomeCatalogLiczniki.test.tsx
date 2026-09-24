import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { Filters } from "@/hooks/useActivityFilters";

/**
 * FMN-B07: licznik "nieznany" (null) to nie 0. Zmierzone 24.09: przed
 * odpowiedzia ff_home_counts pasek pisal "Zadna atrakcja nie spelnia
 * wybranych filtrow", a po 500 opcja "Zoo (0)" dawala 297 wynikow — bez
 * ponowienia.
 */
type Odpowiedz = { data: unknown; error: unknown } | "wyjatek" | "wisi";

const { stan } = vi.hoisted(() => ({
  stan: {
    kolejka: [] as Odpowiedz[],
    wywolaniaLicznikow: 0,
    zwolnij: null as null | (() => void),
  },
}));

const LICZNIKI = { region: { mazowieckie: 120 }, type: { zoo: 297 }, age: { "3-5": 500 }, filtered: 297, total: 4892 };
const BLAD_500 = { data: null, error: { message: "500", code: "500" } };

vi.mock("@/lib/catalogClient", () => ({
  CARD_COLUMNS: "*",
  mapCatalogRow: (r: { id: string }) => ({ id: r.id }),
  catalogClient: {
    rpc: (nazwa: string) => {
      if (nazwa === "ff_home_list") {
        const p = Promise.resolve({ data: [{ id: "a0" }], error: null });
        return { select: () => p };
      }
      stan.wywolaniaLicznikow += 1;
      const o = stan.kolejka.shift() ?? { data: LICZNIKI, error: null };
      if (o === "wyjatek") return Promise.reject(new TypeError("Failed to fetch"));
      if (o === "wisi") return new Promise((r) => (stan.zwolnij = () => r({ data: LICZNIKI, error: null })));
      return Promise.resolve(o);
    },
  },
}));

import { useHomeCatalog, PONOWIENIA_LICZNIKOW_MS } from "@/hooks/useHomeCatalog";

const FILTRY: Filters = { age: "3-5" };

/** Przepuszcza obietnice i timery do `ms` w przod. */
const odczekaj = (ms: number) => act(async () => {
  await vi.advanceTimersByTimeAsync(ms);
});

describe("useHomeCatalog — liczniki nieznane i ponowienia (FMN-B07)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stan.kolejka.length = 0;
    stan.wywolaniaLicznikow = 0;
    stan.zwolnij = null;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("przed odpowiedzia liczniki sa null, nie 0", async () => {
    stan.kolejka.push("wisi");
    const { result } = renderHook(() => useHomeCatalog(FILTRY, "", true, true));
    await odczekaj(0);

    expect(result.current.filterCounts.filtered).toBeNull();
    expect(result.current.filterCounts.total).toBeNull();
    expect(result.current.filterCounts.type.every((o) => o.count === null)).toBe(true);
    expect(result.current.filterCounts.city.every((o) => o.count === null)).toBe(true);
    expect(result.current.hasMore).toBe(false);

    await act(async () => stan.zwolnij?.());
    expect(result.current.filterCounts.filtered).toBe(297);
    expect(result.current.filterCounts.type.find((o) => o.value === "zoo")?.count).toBe(297);
  });

  it("500 raz: ponowienie po pierwszym odstepie oddaje liczby, lista bez bledu", async () => {
    stan.kolejka.push(BLAD_500);
    const { result } = renderHook(() => useHomeCatalog(FILTRY, "", true, true));
    await odczekaj(0);

    expect(stan.wywolaniaLicznikow).toBe(1);
    expect(result.current.filterCounts.filtered).toBeNull();
    // Blad licznikow nie jest bledem listy (dawniej zdejmowal "Pokaz wiecej").
    expect(result.current.error).toBeNull();

    await odczekaj(PONOWIENIA_LICZNIKOW_MS[0] - 1);
    expect(stan.wywolaniaLicznikow).toBe(1);
    await odczekaj(1);
    expect(stan.wywolaniaLicznikow).toBe(2);
    expect(result.current.filterCounts.filtered).toBe(297);
    expect(result.current.filterCounts.type.find((o) => o.value === "zoo")?.count).toBe(297);
  });

  it("zerwane polaczenie (wyjatek) tez jest ponawiane", async () => {
    stan.kolejka.push("wyjatek");
    const { result } = renderHook(() => useHomeCatalog(FILTRY, "", true, true));
    await odczekaj(0);
    expect(result.current.filterCounts.filtered).toBeNull();

    await odczekaj(PONOWIENIA_LICZNIKOW_MS[0]);
    expect(result.current.filterCounts.filtered).toBe(297);
  });

  it("wszystkie proby padaja: tyle wywolan, ile odstepow + 1, liczniki zostaja null", async () => {
    stan.kolejka.push(...Array(10).fill(BLAD_500));
    const { result } = renderHook(() => useHomeCatalog(FILTRY, "", true, true));
    const suma = PONOWIENIA_LICZNIKOW_MS.reduce((a, b) => a + b, 0);
    await odczekaj(suma + 10_000);

    expect(stan.wywolaniaLicznikow).toBe(PONOWIENIA_LICZNIKOW_MS.length + 1);
    expect(result.current.filterCounts.filtered).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.activities).toHaveLength(1);

    // refetch() zaczyna seria od nowa.
    stan.kolejka.length = 0;
    act(() => result.current.refetch());
    await odczekaj(0);
    expect(result.current.filterCounts.filtered).toBe(297);
  });

  it("realne zero zostaje zerem (brak klucza w odpowiedzi = 0)", async () => {
    stan.kolejka.push({ data: { region: {}, type: {}, age: {}, filtered: 0, total: 4892 }, error: null });
    const { result } = renderHook(() => useHomeCatalog(FILTRY, "", true, true));
    await odczekaj(0);

    expect(result.current.filterCounts.filtered).toBe(0);
    expect(result.current.filterCounts.type.every((o) => o.count === 0)).toBe(true);
  });

  it("blad po zmianie filtrow: liczniki poprzednich filtrow nie udaja biezacych", async () => {
    const { result, rerender } = renderHook(({ f }: { f: Filters }) => useHomeCatalog(f, "", true, true), {
      initialProps: { f: FILTRY },
    });
    await odczekaj(0);
    expect(result.current.filterCounts.filtered).toBe(297);

    stan.kolejka.push(BLAD_500);
    rerender({ f: { age: "3-5", type: ["zoo"] } });
    await odczekaj(300); // debounce klucza (250 ms) + odpowiedz
    expect(stan.wywolaniaLicznikow).toBe(2);
    expect(result.current.filterCounts.filtered).toBeNull();
    expect(result.current.hasMore).toBe(false);
  });

  it("liczniki wylaczone: null, bez zapytania", async () => {
    const { result } = renderHook(() => useHomeCatalog(FILTRY, "", false, false));
    await odczekaj(1000);
    expect(stan.wywolaniaLicznikow).toBe(0);
    expect(result.current.filterCounts.filtered).toBeNull();
  });
});
