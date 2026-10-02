import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useLayoutEffect } from "react";
import type { Filters } from "@/hooks/useActivityFilters";

/**
 * FMN-B51: pasek wynikow po "wstecz" albo logo.
 *
 * Zmierzone 26.09 (FMN-5-045, repro 12/12): /?type=zoo&region=malopolskie -> logo -> "wstecz":
 * "40 atrakcji pasuje" -> "4892 atrakcje pasuja do wybranych filtrow" -> "40". Hook trzymal
 * liczniki POPRZEDNICH filtrow przez debounce (250 ms) i czas zapytania.
 *
 * Wiersz 27 (02.10): wyciszanie paska przy kazdej zmianie (null do odpowiedzi) naprawialo 045,
 * ale migalo "Zadna atrakcja" -> pusto -> "Zadna atrakcja" przy pisaniu frazy. Stad wariant:
 * filtry juz policzone = ich liczniki od razu; nowe filtry = ostatnie liczniki do odpowiedzi,
 * pasek nigdy nie milknie.
 */
type Args = { p_tokens: string[] | null; p_types: string[] | null };

const { stan } = vi.hoisted(() => ({
  stan: { wstrzymajLiczniki: false, zwolnijLiczniki: [] as (() => void)[] },
}));

/** Wynik "serwera" zalezy tylko od argumentow: fraza = 0, zoo = 40, bez filtrow = 4892. */
const ilePasuje = (a: Args) => (a.p_tokens ? 0 : a.p_types?.includes("zoo") ? 40 : 4892);

vi.mock("@/lib/catalogClient", () => ({
  CARD_COLUMNS: "*",
  mapCatalogRow: (r: { id: string }) => ({ id: r.id }),
  catalogClient: {
    rpc: (nazwa: string, a: Args) => {
      if (nazwa === "ff_home_counts") {
        const odp = {
          data: { region: {}, type: { zoo: 297 }, age: {}, filtered: ilePasuje(a), total: 4892 },
          error: null,
        };
        if (stan.wstrzymajLiczniki) return new Promise((r) => stan.zwolnijLiczniki.push(() => r(odp)));
        return Promise.resolve(odp);
      }
      const p = Promise.resolve({ data: ilePasuje(a) === 0 ? [] : [{ id: "a0" }], error: null });
      return { select: () => p };
    },
  },
}));

import { useHomeCatalog } from "@/hooks/useHomeCatalog";

type Props = { f: Filters; q: string };

/** filtered z KAZDEGO zatwierdzonego renderu (to, co moze trafic na pasek). */
function renderujZKlatkami(initialProps: Props) {
  const klatki: (number | null)[] = [];
  const hook = renderHook(
    ({ f, q }: Props) => {
      const w = useHomeCatalog(f, q, true, true);
      useLayoutEffect(() => {
        klatki.push(w.filterCounts.filtered);
      });
      return w;
    },
    { initialProps },
  );
  return { ...hook, klatki };
}

const odczekaj = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

const ZOO: Filters = { type: ["zoo"], city: "malopolskie" };
const BEZ: Filters = {};

describe("useHomeCatalog — liczniki po powrocie do policzonych filtrow (FMN-B51)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stan.wstrzymajLiczniki = false;
    stan.zwolnijLiczniki.length = 0;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("filtry -> logo -> wstecz: zaden render nie pokazuje liczby bez filtra przy filtrze", async () => {
    const { result, klatki, rerender } = renderujZKlatkami({ f: ZOO, q: "" });
    await odczekaj(0);
    expect(result.current.filterCounts.filtered).toBe(40);

    rerender({ f: BEZ, q: "" }); // logo
    await odczekaj(300);
    expect(result.current.filterCounts.filtered).toBe(4892);

    // "wstecz": serwer odpowiada wolno, a pasek ma od razu liczbe tych filtrow.
    stan.wstrzymajLiczniki = true;
    const odPowrotu = klatki.length;
    rerender({ f: ZOO, q: "" });
    await odczekaj(300);
    expect(klatki.slice(odPowrotu)).not.toContain(4892);
    expect(klatki.slice(odPowrotu).every((n) => n === 40)).toBe(true);

    stan.zwolnijLiczniki.forEach((z) => z());
    await odczekaj(0);
    expect(result.current.filterCounts.filtered).toBe(40);
    expect(result.current.filterCounts.type.find((o) => o.value === "zoo")?.count).toBe(297);
  });

  it("nowe filtry: pasek nie milknie (ostatnia liczba do odpowiedzi, bez null)", async () => {
    const { result, klatki, rerender } = renderujZKlatkami({ f: BEZ, q: "żółw" });
    await odczekaj(0);
    expect(result.current.filterCounts.filtered).toBe(0);

    stan.wstrzymajLiczniki = true;
    const odZmiany = klatki.length;
    rerender({ f: BEZ, q: "żółwie" }); // fraza dopisywana, liczba sie nie zmienia
    await odczekaj(300);
    expect(klatki.slice(odZmiany)).not.toContain(null);

    stan.zwolnijLiczniki.forEach((z) => z());
    await odczekaj(0);
    expect(klatki.slice(odZmiany).every((n) => n === 0)).toBe(true);
  });
});
