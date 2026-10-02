import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

// Licznik wywołań dopasowania frazy — prawdziwa implementacja, tylko policzona.
const licznik = vi.hoisted(() => ({ n: 0 }));
vi.mock("@/lib/searchMatch", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/searchMatch")>();
  return {
    ...orig,
    matchesSearchQuery: (...args: Parameters<typeof orig.matchesSearchQuery>) => {
      licznik.n += 1;
      return orig.matchesSearchQuery(...args);
    },
  };
});

import { useActivityFilters } from "@/hooks/useActivityFilters";
import { setActivities, type Activity } from "@/data/activities";

/**
 * FMN wiersz 20 (03.10): na mapie z frazą klik kategorii zajmował wątek ok. 5 s przy CPU 4x.
 * Profil: 5,0 z 5,3 s w filterCounts -> getCountForFilter, który dla każdej z 36 opcji filtrów
 * przepuszczał cały katalog przez matchesSearchQuery. Fraza nie zmienia się przy kliku filtra,
 * więc katalog po frazie liczy się raz (bazaFrazy) — liczniki muszą wyjść te same.
 */
const TYPY = ["park-rozrywki", "centra-rozrywki", "plac-zabaw", "zoo"];
const MIASTA = ["malopolskie", "mazowieckie", "slaskie"];
const KATALOG = Array.from({ length: 60 }, (_, i) => ({
  id: i + 1,
  title: i % 3 === 0 ? `Kraków atrakcja ${i}` : `Atrakcja ${i}`,
  location: i % 5 === 0 ? "Kraków, ul. Długa" : "Warszawa",
  city: MIASTA[i % 3],
  type: TYPY[i % 4],
  tags: [],
  ageMin: i % 2 === 0 ? 0 : 6,
  ageMax: i % 2 === 0 ? 5 : 12,
  isEvent: i === 59,
  isIndoor: i % 2 === 0,
  priceLevel: i % 4 === 0 ? 0 : 2,
  rating: 4 + (i % 10) / 10,
  reviewCount: i,
})) as unknown as Activity[];

const wrapper = (url: string) =>
  ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>;

/** Liczniki „po staremu”: każda opcja liczona od całego katalogu, z frazą sprawdzaną tekstowo. */
function oczekiwaneTypy(typyWybrane: string[], wiek: [number, number]) {
  const zFraza = KATALOG.filter(
    (a) => !a.isEvent && /krak/i.test(`${a.title} ${a.location} ${a.city === "malopolskie" ? "Małopolskie" : ""}`),
  );
  void typyWybrane;
  return TYPY.map((t) => zFraza.filter((a) => a.ageMin <= wiek[1] && a.ageMax >= wiek[0] && a.type === t).length);
}

describe("useActivityFilters — fraza liczona raz, nie przy każdym kliku filtra", () => {
  beforeEach(() => {
    setActivities(KATALOG);
    licznik.n = 0;
  });

  it("klik kategorii przy frazie nie przelicza frazy, liczniki bez zmian", () => {
    const { result } = renderHook(() => useActivityFilters(), {
      wrapper: wrapper("/?age=3-5&type=park-rozrywki&search=krak%C3%B3w&view=map"),
    });
    const poWejsciu = licznik.n;
    // jedno przejście katalogu (bez wydarzenia), nie 37
    expect(poWejsciu).toBeLessThanOrEqual(KATALOG.length - 1);

    const typy = (r: typeof result) =>
      TYPY.map((t) => r.current.filterCounts.type.find((o) => o.value === t)?.count);
    expect(typy(result)).toEqual(oczekiwaneTypy(["park-rozrywki"], [3, 5]));

    licznik.n = 0;
    act(() => result.current.toggleArrayFilter("type", "centra-rozrywki"));

    expect(result.current.filters.type).toEqual(["park-rozrywki", "centra-rozrywki"]);
    expect(licznik.n).toBe(0);
    expect(typy(result)).toEqual(oczekiwaneTypy(["park-rozrywki", "centra-rozrywki"], [3, 5]));
    const oczekiwaneWyniki = KATALOG.filter(
      (a) =>
        !a.isEvent &&
        /krak/i.test(`${a.title} ${a.location} ${a.city === "malopolskie" ? "Małopolskie" : ""}`) &&
        a.ageMin <= 5 && a.ageMax >= 3 &&
        ["park-rozrywki", "centra-rozrywki"].includes(a.type),
    ).length;
    expect(result.current.filteredActivities.length).toBe(oczekiwaneWyniki);
    expect(result.current.filterCounts.filtered).toBe(oczekiwaneWyniki);
  });

  it("zmiana frazy przelicza bazę (liczniki idą za nową frazą)", () => {
    const { result } = renderHook(() => useActivityFilters(), {
      wrapper: wrapper("/?search=krak%C3%B3w"),
    });
    const zKrakowem = result.current.filterCounts.filtered;
    act(() => result.current.setSearchQuery(""));
    expect(result.current.filterCounts.filtered).toBe(KATALOG.length - 1);
    expect(zKrakowem).toBeLessThan(KATALOG.length - 1);
  });

  it("nowy katalog (setActivities) przelicza bazę bez zmiany filtrów", () => {
    const { result, rerender } = renderHook(() => useActivityFilters(), {
      wrapper: wrapper("/?search=krak%C3%B3w"),
    });
    const przed = result.current.filterCounts.filtered;
    act(() => setActivities(KATALOG.slice(0, 30)));
    rerender();
    expect(result.current.filterCounts.filtered).toBeLessThan(przed);
  });
});
