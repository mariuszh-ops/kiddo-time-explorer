import { describe, it, expect } from "vitest";
import { filterOptions } from "@/data/activities";
import { AGE_RANGES } from "@/components/CategoryFilterBar";
import { PASMA_WIEKU, pasmaZWersjiRoboczej, zakresWiekuZPasm } from "@/lib/pasmaWieku";

/**
 * AF-10-017 (D5 = A): formularz „Zgłoś atrakcję” ma te same pasma wieku co filtr.
 * Filtr ma dziś dwie kopie definicji: `filterOptions.age` („/”, liczniki RPC)
 * i `AGE_RANGES` (strona województwa/kategorii). Test pilnuje, żeby żadna z trzech
 * list się nie rozjechała.
 */

describe("AF-10-017 — jedno źródło pasm wieku", () => {
  it("formularz = filterOptions.age = AGE_RANGES (wartość, etykieta, granice)", () => {
    expect(PASMA_WIEKU).toEqual(filterOptions.age);
    expect(AGE_RANGES).toEqual(filterOptions.age);
  });

  it("pasma filtra: 0–2 / 3–5 / 6–9 / 10–13 / 14+ i bez dziur między pasmami", () => {
    expect(PASMA_WIEKU.map((p) => p.label)).toEqual(["0–2 lata", "3–5 lat", "6–9 lat", "10–13 lat", "14+"]);
    for (let i = 1; i < PASMA_WIEKU.length; i++) {
      expect(PASMA_WIEKU[i].min).toBe(PASMA_WIEKU[i - 1].max + 1);
    }
  });
});

describe("zakresWiekuZPasm — age_min/age_max zgłoszenia", () => {
  it.each(filterOptions.age.map((p) => [p.value, p.min, p.max] as const))(
    "jedno pasmo %s -> %i..%i (granice filtra)",
    (id, min, max) => {
      expect(zakresWiekuZPasm([id])).toEqual({ ageMin: min, ageMax: max });
    },
  );

  it("kilka pasm -> od najmłodszego do najstarszego, kolejność zaznaczenia bez znaczenia", () => {
    expect(zakresWiekuZPasm(["10-13", "3-5"])).toEqual({ ageMin: 3, ageMax: 13 });
    expect(zakresWiekuZPasm(["14-16", "0-2"])).toEqual({ ageMin: 0, ageMax: 16 });
  });

  it("„14+” daje 14..16, a nie 0..16 (stary „15+” przez NaN dawał age_min 0)", () => {
    expect(zakresWiekuZPasm(["14-16"])).toEqual({ ageMin: 14, ageMax: 16 });
  });

  it("brak znanych pasm -> null (nieznane identyfikatory pomijane)", () => {
    expect(zakresWiekuZPasm([])).toBeNull();
    expect(zakresWiekuZPasm(["4-6", "15+"])).toBeNull();
    expect(zakresWiekuZPasm(["4-6", "6-9"])).toEqual({ ageMin: 6, ageMax: 9 });
  });
});

describe("pasmaZWersjiRoboczej — wersja robocza sprzed zmiany pasm", () => {
  it.each([
    [["0-3"], ["0-2", "3-5"]],
    [["4-6"], ["3-5", "6-9"]],
    [["7-10"], ["6-9", "10-13"]],
    [["11-14"], ["10-13", "14-16"]],
    [["15+"], ["14-16"]],
    [["15+", "0-3"], ["0-2", "3-5", "14-16"]],
  ])("stare %j -> pasma filtra %j", (stare, nowe) => {
    expect(pasmaZWersjiRoboczej(stare)).toEqual(nowe);
  });

  it("nowe pasma przechodzą bez zmian (także „14-16”, który wygląda jak zakres)", () => {
    for (const p of filterOptions.age) expect(pasmaZWersjiRoboczej([p.value])).toEqual([p.value]);
    expect(pasmaZWersjiRoboczej(["6-9", "0-2"])).toEqual(["0-2", "6-9"]);
  });

  it("śmieci i brak pola -> pusta lista (formularz poprosi o wybór)", () => {
    expect(pasmaZWersjiRoboczej(undefined)).toEqual([]);
    expect(pasmaZWersjiRoboczej("0-3")).toEqual([]);
    expect(pasmaZWersjiRoboczej([1, null, "abc", "x-y"])).toEqual([]);
  });
});
