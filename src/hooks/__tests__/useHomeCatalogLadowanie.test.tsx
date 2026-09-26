import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useLayoutEffect } from "react";
import type { Filters } from "@/hooks/useActivityFilters";

/**
 * FMN-B31: lista z filtrem nie moze powiedziec "Nic nie pasuje do filtrow",
 * zanim ruszy ladowanie. Zmierzone 26.09 (CPU 6x + Fast 3G): wejscie na
 * /?age=3-5 pokazywalo pustke przez 357-1004 ms przed 3119 wynikami, a
 * "Sprobuj ponownie" po bledzie listy migalo nia przez klatke.
 *
 * ActivityGrid rysuje pustke przy: 0 atrakcji, !isLoading i bez bledu. Test
 * zapisuje stan KAZDEGO zatwierdzonego renderu (to, co moze trafic na ekran)
 * i szuka takiego stanu, zanim serwer odpowie.
 */
type Odpowiedz = { data: unknown; error: unknown } | "wisi";

const { stan } = vi.hoisted(() => ({
  stan: {
    kolejka: [] as Odpowiedz[],
    wywolaniaListy: 0,
    zwolnij: null as null | (() => void),
  },
}));

const WIERSZE = [{ id: "a0" }, { id: "a1" }];
const BLAD_500 = { data: null, error: { message: "500", code: "500" } };

vi.mock("@/lib/catalogClient", () => ({
  CARD_COLUMNS: "*",
  mapCatalogRow: (r: { id: string }) => ({ id: r.id }),
  catalogClient: {
    rpc: (nazwa: string) => {
      if (nazwa === "ff_home_counts") {
        return Promise.resolve({ data: { region: {}, type: {}, age: {}, filtered: 3, total: 3 }, error: null });
      }
      stan.wywolaniaListy += 1;
      const o = stan.kolejka.shift() ?? { data: WIERSZE, error: null };
      const p =
        o === "wisi"
          ? new Promise((r) => (stan.zwolnij = () => r({ data: WIERSZE, error: null })))
          : Promise.resolve(o);
      return { select: () => p };
    },
  },
}));

import { useHomeCatalog } from "@/hooks/useHomeCatalog";

const FILTRY: Filters = { age: "3-5" };

interface Klatka {
  atrakcje: number;
  laduje: boolean;
  blad: boolean;
}
/** Stan, w ktorym ActivityGrid pokazuje "Nic nie pasuje do filtrow". */
const pustka = (k: Klatka) => k.atrakcje === 0 && !k.laduje && !k.blad;

function renderujZKlatkami(initialProps: { enabled: boolean }) {
  const klatki: Klatka[] = [];
  const hook = renderHook(
    ({ enabled }: { enabled: boolean }) => {
      const wynik = useHomeCatalog(FILTRY, "", enabled, true);
      useLayoutEffect(() => {
        klatki.push({ atrakcje: wynik.activities.length, laduje: wynik.loading, blad: wynik.error !== null });
      });
      return wynik;
    },
    { initialProps },
  );
  return { ...hook, klatki };
}

const odczekaj = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

describe("useHomeCatalog — brak falszywej pustki przed ladowaniem (FMN-B31)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stan.kolejka.length = 0;
    stan.wywolaniaListy = 0;
    stan.zwolnij = null;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("wejscie z filtrem z adresu: pierwszy render juz laduje", async () => {
    stan.kolejka.push("wisi");
    const { result, klatki } = renderujZKlatkami({ enabled: true });
    await odczekaj(0);

    expect(klatki[0]).toEqual({ atrakcje: 0, laduje: true, blad: false });
    expect(klatki.filter(pustka)).toEqual([]);

    await act(async () => stan.zwolnij?.());
    expect(result.current.activities).toHaveLength(2);
    expect(result.current.loading).toBe(false);
  });

  it("'Sprobuj ponownie' po bledzie listy: zaden render bez bledu i bez ladowania", async () => {
    stan.kolejka.push(BLAD_500, "wisi");
    const { result, klatki } = renderujZKlatkami({ enabled: true });
    await odczekaj(0);
    expect(result.current.error).not.toBeNull();
    expect(result.current.loading).toBe(false);

    const odKlikniecia = klatki.length;
    act(() => result.current.refetch());
    await odczekaj(0);

    expect(klatki.slice(odKlikniecia).filter(pustka)).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    await act(async () => stan.zwolnij?.());
    expect(result.current.activities).toHaveLength(2);
  });

  it("mapa -> lista (enabled false -> true): od pierwszego renderu listy laduje", async () => {
    stan.kolejka.push("wisi");
    const { result, klatki, rerender } = renderujZKlatkami({ enabled: false });
    await odczekaj(0);
    expect(stan.wywolaniaListy).toBe(0);

    const odPrzelaczenia = klatki.length;
    rerender({ enabled: true });
    await odczekaj(0);

    expect(klatki.slice(odPrzelaczenia).filter(pustka)).toEqual([]);
    expect(result.current.loading).toBe(true);

    await act(async () => stan.zwolnij?.());
    expect(result.current.activities).toHaveLength(2);
  });

  it("realne zero: pusta odpowiedz od razu konczy ladowanie", async () => {
    stan.kolejka.push({ data: [], error: null });
    const { result, klatki } = renderujZKlatkami({ enabled: true });
    await odczekaj(0);

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(klatki.at(-1)).toEqual({ atrakcje: 0, laduje: false, blad: false });
  });

  it("'Sprobuj ponownie' po bledzie doczytania: dokleja kolejna porcje, lista zostaje", async () => {
    stan.kolejka.push({ data: WIERSZE, error: null }, BLAD_500, { data: [{ id: "a2" }], error: null });
    const { result, klatki } = renderujZKlatkami({ enabled: true });
    await odczekaj(0);

    act(() => result.current.loadMore());
    await odczekaj(0);
    expect(result.current.error).not.toBeNull();
    expect(result.current.activities).toHaveLength(2);

    const odKlikniecia = klatki.length;
    act(() => result.current.refetch());
    await odczekaj(0);

    expect(result.current.activities.map((a) => a.id)).toEqual(["a0", "a1", "a2"]);
    expect(result.current.error).toBeNull();
    expect(klatki.slice(odKlikniecia).every((k) => k.atrakcje === 2 || k.atrakcje === 3)).toBe(true);
  });
});
