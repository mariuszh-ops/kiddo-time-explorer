import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useLayoutEffect } from "react";
import type { Filters } from "@/hooks/useActivityFilters";

/**
 * FMN-B41: hook musi wiedziec, dla jakich filtrow jest lista na ekranie.
 *
 * FMN-B41 (zmierzone 26.09): /?age=3-5 -> fraza "żółw" (0 wynikow) -> wyczyszczenie
 * pola: przez ok. 0,3 s "Nic nie pasuje do filtrow", potem 3119 wynikow. Pusta
 * lista po STAREJ frazie, loading false, klucz w debounce (250 ms).
 *
 * Test zapisuje stan KAZDEGO zatwierdzonego renderu (to, co moze trafic na ekran).
 */
type Args = { p_tokens: string[] | null; p_types: string[] | null; p_region: string | null };

const { stan } = vi.hoisted(() => ({
  stan: {
    wstrzymajListe: false,
    wstrzymajLiczniki: false,
    zwolnijListe: [] as (() => void)[],
    zwolnijLiczniki: [] as (() => void)[],
    wywolaniaLicznikow: 0,
  },
}));

const WIERSZE = [{ id: "a0" }, { id: "a1" }];

/** Wynik "serwera" zalezy tylko od argumentow: fraza = 0 wynikow, zoo w malopolsce = 40. */
const ilePasuje = (a: Args) => (a.p_tokens ? 0 : a.p_types?.includes("zoo") ? 40 : 4892);

vi.mock("@/lib/catalogClient", () => ({
  CARD_COLUMNS: "*",
  mapCatalogRow: (r: { id: string }) => ({ id: r.id }),
  catalogClient: {
    rpc: (nazwa: string, a: Args) => {
      if (nazwa === "ff_home_counts") {
        stan.wywolaniaLicznikow += 1;
        const n = ilePasuje(a);
        const odp = { data: { region: {}, type: { zoo: 297 }, age: {}, filtered: n, total: 4892 }, error: null };
        if (stan.wstrzymajLiczniki) return new Promise((r) => stan.zwolnijLiczniki.push(() => r(odp)));
        return Promise.resolve(odp);
      }
      const odp = { data: ilePasuje(a) === 0 ? [] : WIERSZE, error: null };
      const p = stan.wstrzymajListe
        ? new Promise((r) => stan.zwolnijListe.push(() => r(odp)))
        : Promise.resolve(odp);
      return { select: () => p };
    },
  },
}));

import { useHomeCatalog } from "@/hooks/useHomeCatalog";

interface Klatka {
  atrakcje: number;
  laduje: boolean;
  blad: boolean;
  filtered: number | null;
  zoo: number | null;
  hasMore: boolean;
}
/** Stan, w ktorym ActivityGrid pokazuje "Nic nie pasuje do filtrow" / "Nie znalezlismy". */
const pustka = (k: Klatka) => k.atrakcje === 0 && !k.laduje && !k.blad;

type Props = { f: Filters; q: string };

function renderujZKlatkami(initialProps: Props) {
  const klatki: Klatka[] = [];
  const hook = renderHook(
    ({ f, q }: Props) => {
      const w = useHomeCatalog(f, q, true, true);
      useLayoutEffect(() => {
        klatki.push({
          atrakcje: w.activities.length,
          laduje: w.loading,
          blad: w.error !== null,
          filtered: w.filterCounts.filtered,
          zoo: w.filterCounts.type.find((o) => o.value === "zoo")?.count ?? null,
          hasMore: w.hasMore,
        });
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

const WIEK: Filters = { age: "3-5" };

describe("useHomeCatalog — pusta lista innej frazy to ladowanie (FMN-B41)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stan.wstrzymajListe = false;
    stan.wstrzymajLiczniki = false;
    stan.zwolnijListe.length = 0;
    stan.zwolnijLiczniki.length = 0;
    stan.wywolaniaLicznikow = 0;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("wyczyszczenie frazy bez wynikow: zaden render z pustka, zanim przyjda wyniki", async () => {
    const { result, klatki, rerender } = renderujZKlatkami({ f: WIEK, q: "żółw" });
    await odczekaj(0);
    // Realne zero dla frazy — tu pustka jest prawda.
    expect(klatki.at(-1)).toMatchObject({ atrakcje: 0, laduje: false, blad: false });

    stan.wstrzymajListe = true;
    const odWyczyszczenia = klatki.length;
    rerender({ f: WIEK, q: "" });
    await odczekaj(0);
    // Okno debounce (250 ms): lista wciaz po "żółw", ale to juz nie jest wynik.
    expect(result.current.loading).toBe(true);
    await odczekaj(300);
    expect(stan.zwolnijListe).toHaveLength(1);
    stan.zwolnijListe.forEach((z) => z());
    await odczekaj(0);

    expect(result.current.activities).toHaveLength(2);
    expect(result.current.loading).toBe(false);
    expect(klatki.slice(odWyczyszczenia).filter(pustka)).toEqual([]);
  });

  it("zmiana frazy bez wynikow na inna: pustka dopiero po odpowiedzi serwera", async () => {
    const { result, klatki, rerender } = renderujZKlatkami({ f: WIEK, q: "żółw" });
    await odczekaj(0);

    stan.wstrzymajListe = true;
    const odZmiany = klatki.length;
    rerender({ f: WIEK, q: "żółwie" });
    await odczekaj(300);
    expect(klatki.slice(odZmiany).filter(pustka)).toEqual([]);
    expect(result.current.loading).toBe(true);

    // Realne zero nowej frazy konczy sie komunikatem pustki.
    stan.zwolnijListe.forEach((z) => z());
    await odczekaj(0);
    expect(pustka(klatki.at(-1)!)).toBe(true);
  });

  it("lista z wynikami przy pisaniu frazy: stare kafle zostaja, bez szkieletu", async () => {
    const { result, klatki, rerender } = renderujZKlatkami({ f: WIEK, q: "" });
    await odczekaj(0);
    expect(result.current.activities).toHaveLength(2);

    const odZmiany = klatki.length;
    rerender({ f: WIEK, q: "zo" });
    await odczekaj(100); // wciaz w oknie debounce
    expect(klatki.slice(odZmiany).every((k) => k.atrakcje === 2 && !k.laduje)).toBe(true);
  });
});
