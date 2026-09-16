import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  listingFromUrl,
  listingFilterKey,
  takeEarlyListing,
  stashEarlyListing,
  clearEarlyListing,
  DEFAULT_LISTING_SORT,
} from "@/lib/listingQuery";

/**
 * A1000-P bloker 2. Wczesny start zapytania (earlyListingStart.ts) i hook
 * (useActivitiesInfinite) muszą policzyć TEN SAM klucz filtrów, inaczej wynik
 * nie zostanie odebrany i strona po cichu wyśle drugie, identyczne zapytanie —
 * bez żadnego objawu w UI. Ten plik pilnuje właśnie tego.
 */
describe("listingFromUrl — które adresy wolno wystartować wcześniej", () => {
  it("czyste trasy listingu dają filtry", () => {
    expect(listingFromUrl("/malopolskie", "")).toMatchObject({ region: "malopolskie", type: undefined });
    expect(listingFromUrl("/malopolskie/zoo", "")).toMatchObject({ region: "malopolskie", type: "zoo" });
    expect(listingFromUrl("/kategoria/zoo", "")).toMatchObject({ region: undefined, type: "zoo" });
    expect(listingFromUrl("/atrakcje/malopolskie/zoo", "")).toMatchObject({ region: "malopolskie", type: "zoo" });
  });

  it("parametry widoku mapy i kampanii nie przeszkadzają", () => {
    expect(listingFromUrl("/malopolskie", "?view=map&utm_source=fb&fbclid=xyz")).not.toBeNull();
  });

  it("każdy filtr i każda strona wyłączają wczesny start", () => {
    for (const q of ["?type=zoo", "?age=6-9", "?free=1", "?min=4", "?sort=name", "?search=zoo", "?auto=0", "?amenities=parking", "?page=2"]) {
      expect(listingFromUrl("/malopolskie", q), q).toBeNull();
    }
  });

  it("nieznane trasy i slugi są pomijane", () => {
    expect(listingFromUrl("/", "")).toBeNull();
    expect(listingFromUrl("/Malopolskie", "")).toBeNull(); // najpierw przekierowanie na małe litery
    expect(listingFromUrl("/warszawa", "")).toBeNull(); // stary slug miasta → redirect
    expect(listingFromUrl("/malopolskie/nie-ma-takiej-kategorii", "")).toBeNull();
    expect(listingFromUrl("/atrakcje/energylandia-zator", "")).toBeNull(); // karta atrakcji, nie listing
    expect(listingFromUrl("/profile", "")).toBeNull();
  });
});

describe("klucz filtrów — zgodność z tym, co CategoryPage podaje hookowi", () => {
  // Skopiowane 1:1 z CategoryPage dla wejścia BEZ parametrów w URL.
  const jakCategoryPage = (region: string | undefined, type: string | undefined) => ({
    region,
    type,
    amenities: [] as string[],
    minRating: 0,
    sort: DEFAULT_LISTING_SORT,
    includeUncertain: true,
    ageMin: undefined,
    ageMax: undefined,
    onlyFree: false,
    search: "",
  });

  it("wczesny start i hook liczą ten sam klucz", () => {
    for (const [sciezka, region, type] of [
      ["/malopolskie", "malopolskie", undefined],
      ["/malopolskie/zoo", "malopolskie", "zoo"],
      ["/kategoria/zoo", undefined, "zoo"],
    ] as const) {
      const zUrl = listingFromUrl(sciezka, "");
      expect(zUrl, sciezka).not.toBeNull();
      expect(listingFilterKey(zUrl!), sciezka).toBe(listingFilterKey(jakCategoryPage(region, type)));
    }
  });
});

describe("skrzynka na wczesny wynik", () => {
  beforeEach(() => clearEarlyListing());

  it("oddaje wynik dokładnie raz", async () => {
    const wynik = Promise.resolve({ data: [], count: 0, error: null });
    stashEarlyListing("k", 0, wynik);
    expect(takeEarlyListing("k", 0)).toBe(wynik);
    expect(takeEarlyListing("k", 0)).toBeNull();
  });

  it("nie oddaje przy innym kluczu ani innej stronie", () => {
    stashEarlyListing("k", 0, Promise.resolve({ data: [], count: 0, error: null }));
    expect(takeEarlyListing("inny", 0)).toBeNull();
    expect(takeEarlyListing("k", 1)).toBeNull();
  });

  it("nie oddaje wyniku starszego niż 10 s", () => {
    vi.useFakeTimers();
    try {
      stashEarlyListing("k", 0, Promise.resolve({ data: [], count: 0, error: null }));
      vi.advanceTimersByTime(10_001);
      expect(takeEarlyListing("k", 0)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
