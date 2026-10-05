import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FilterBar from "@/components/FilterBar";
import type { HomeFilterCounts } from "@/hooks/useHomeCatalog";

/**
 * noc 06.10 wiersz 1 (K1 I9a, SITO 03.10): wyjscie z realnego zera do wynikow
 * ("wstecz" po F5, chip mapy, filtr regionu). FMN-B51 trzyma liczniki POPRZEDNICH
 * filtrow do odpowiedzi serwera, wiec przez debounce + zapytanie pasek mial
 * filtered = 0 i pisal "Zadna atrakcja nie spelnia wybranych filtrow" obok pinow
 * biezacych filtrow (FMN-2-039 krok 6: 7 pinow, 25 w widoku, komunikat 278 ms).
 * Realne zero (0 pinow albo brak wiedzy o pinach) dalej daje komunikat — pisanie
 * frazy bez wynikow nie miga "Zadna -> pusto -> Zadna" (wiersz 27).
 */
const PUSTKA = "Żadna atrakcja nie spełnia wybranych filtrów";

const liczniki = (n: number | null): HomeFilterCounts => ({
  city: [{ value: "slaskie", label: "Śląskie", count: n }],
  age: [{ value: "3-5", label: "3–5 lat", count: n }],
  type: [{ value: "zoo", label: "Zoo", count: n }],
  indoor: [],
  activityKind: [],
  distance: [],
  price: [],
  total: n,
  filtered: n,
  hasAnyFilter: true,
});

const noop = () => {};

const renderBar = (n: number | null, wynikiNaEkranie?: number | null) =>
  render(
    <MemoryRouter>
      <FilterBar
        filters={{ city: "slaskie", type: ["centra-rozrywki"] }}
        searchQuery=""
        onSearchChange={noop}
        filterCounts={liczniki(n)}
        onUpdateFilter={noop}
        onToggleTypeFilter={noop}
        onClearAll={noop}
        viewMode="map"
        hideSearch
        wynikiNaEkranie={wynikiNaEkranie}
      />
    </MemoryRouter>,
  );

const tekstStatusu = () => screen.getAllByRole("status").map((s) => s.textContent?.trim() ?? "").join(" | ");

describe("FilterBar — stary licznik 0 przy pinach biezacych filtrow (noc 06.10 wiersz 1)", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
  });

  it("stary licznik 0 + nowe zapytanie w toku, a na mapie 7 pinow: brak komunikatu pustki i brak '0'", () => {
    renderBar(0, 7);
    expect(tekstStatusu()).not.toContain(PUSTKA);
    expect(tekstStatusu()).not.toMatch(/(^|\D)0 atrakcj/);
  });

  it("realne zero (0 pinow): komunikat pustki zostaje", () => {
    renderBar(0, 0);
    expect(tekstStatusu()).toContain(PUSTKA);
  });

  it("nie wiadomo, co na ekranie (lista, katalog sie laduje): zero jak dotad = komunikat", () => {
    renderBar(0, null);
    expect(tekstStatusu()).toContain(PUSTKA);
  });

  it("nowy licznik przyszedl: liczba bez zmian", () => {
    renderBar(600, 7);
    expect(tekstStatusu()).toContain("600 atrakcji pasuje do wybranych filtrów");
  });
});
