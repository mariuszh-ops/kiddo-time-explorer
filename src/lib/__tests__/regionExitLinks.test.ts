import { describe, expect, it } from "vitest";
import { regionExitLinks } from "@/lib/regionExitLinks";

/**
 * FMN-B52: „Usuń filtr województwa”, „Usuń filtr kategorii” i „Szukaj w całej
 * Polsce” zdejmują tylko swój filtr. Wcześniej niosły samą frazę.
 */
describe("regionExitLinks — linki wyjścia ze strony województwa", () => {
  const pelne = {
    age: "3-5",
    sort: "rating" as const,
    minRating: 4,
    onlyFree: true,
    amenities: ["parking", "toilet"],
    hideUncertain: true,
    search: "zoo",
  };

  it("/<woj>: zdjęcie województwa i „cała Polska” zostawiają frazę, wiek i kategorię", () => {
    const l = regionExitLinks("mazowieckie", undefined, { age: "3-5", type: "zoo", search: "zoo" });
    expect(l.removeRegionTo).toBe("/?age=3-5&type=zoo&search=zoo");
    expect(l.wholePolandTo).toBe(l.removeRegionTo);
  });

  it("/<woj> -> „/”: sort tłumaczony jawną mapą, min/free/amenities/auto pominięte", () => {
    const l = regionExitLinks("mazowieckie", undefined, { ...pelne, type: "zoo", sort: "reviews" });
    expect(l.removeRegionTo).toBe("/?age=3-5&type=zoo&sort=most_reviewed&search=zoo");
    const p = new URLSearchParams(l.removeRegionTo.split("?")[1]);
    for (const k of ["min", "free", "amenities", "auto", "page", "view"]) expect(p.has(k)).toBe(false);
  });

  it("/<woj>/<kat>: zdjęcie województwa -> /kategoria/<kat> z tym samym słownikiem, bez type", () => {
    const l = regionExitLinks("mazowieckie", "zoo", pelne);
    expect(l.removeRegionTo).toBe(
      "/kategoria/zoo?age=3-5&sort=rating&min=4&free=1&amenities=parking%2Ctoilet&auto=0&search=zoo",
    );
    expect(l.wholePolandTo).toBe(l.removeRegionTo);
  });

  it("/<woj>/<kat>: zdjęcie kategorii -> /<woj> z wiekiem, sortem i resztą filtrów", () => {
    const l = regionExitLinks("mazowieckie", "zoo", pelne);
    expect(l.removeCategoryTo).toBe(
      "/mazowieckie?age=3-5&sort=rating&min=4&free=1&amenities=parking%2Ctoilet&auto=0&search=zoo",
    );
  });

  it("/kategoria/<kat>: zdjęcie kategorii i „cała Polska” -> „/” z wiekiem, bez kategorii", () => {
    const l = regionExitLinks(undefined, "zoo", { age: "6-9", sort: "name", search: "lwy" });
    expect(l.removeCategoryTo).toBe("/?age=6-9&sort=name&search=lwy");
    expect(l.wholePolandTo).toBe("/?age=6-9&sort=name&search=lwy");
  });

  it("bez filtrów: czysta ścieżka, bez pustego „?”", () => {
    const l = regionExitLinks("slaskie", undefined, {});
    expect(l.removeRegionTo).toBe("/");
    expect(regionExitLinks("slaskie", "zoo", {}).removeRegionTo).toBe("/kategoria/zoo");
  });

  it("fraza ze spacją wraca z adresu bez zmian", () => {
    const l = regionExitLinks("mazowieckie", undefined, { search: "park linowy" });
    expect(new URLSearchParams(l.removeRegionTo.split("?")[1]).get("search")).toBe("park linowy");
  });
});

/**
 * FMN-B54 (R2 = A): okruszek „Strona główna” na stronie województwa/kategorii
 * prowadzi na „/” z województwem, wiekiem i kategorią. Zmierzone 26.09: 7/7 bez filtrów.
 */
describe("regionExitLinks — homeTo (okruszek „Strona główna”)", () => {
  it("/<woj>?type=: region, wiek i kategoria z ?type=; sort, min i fraza nie przechodzą", () => {
    const l = regionExitLinks("mazowieckie", undefined, {
      age: "6-9",
      type: "zoo",
      sort: "rating",
      minRating: 4.5,
      search: "zoo",
    });
    expect(l.homeTo).toBe("/?region=mazowieckie&age=6-9&type=zoo");
  });

  it("/<woj>/<kat>: kategoria ze ścieżki", () => {
    expect(regionExitLinks("mazowieckie", "sala-zabaw", { age: "3-5", sort: "name", onlyFree: true }).homeTo).toBe(
      "/?region=mazowieckie&age=3-5&type=sala-zabaw",
    );
  });

  it("/kategoria/<kat>: bez województwa", () => {
    expect(regionExitLinks(undefined, "zoo", { age: "3-5" }).homeTo).toBe("/?age=3-5&type=zoo");
  });

  it("strona województwa bez filtrów: „/” z samym województwem", () => {
    expect(regionExitLinks("slaskie", undefined, {}).homeTo).toBe("/?region=slaskie");
  });
});
