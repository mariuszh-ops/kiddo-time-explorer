import { describe, expect, it } from "vitest";
import { RATING_OPTIONS, minRatingFromUrl } from "@/components/CategoryFilterBar";

/**
 * FMN-B82: strona województwa z ?min=10 (albo min=5) pokazywała w polu oceny
 * „4,8+", a filtrowała po wartości z adresu: 0 wyników zamiast 600. Adres
 * przyjmujemy tylko z listy opcji pola; reszta = „Dowolna ocena" (0).
 */
describe("minRatingFromUrl (FMN-B82)", () => {
  it("wartość spoza skali albo spoza opcji = 0 (Dowolna ocena)", () => {
    for (const raw of ["10", "5", "4", "4.0", "3.5", "4.9", "-1", "Infinity", "4,5", "abc", ""]) {
      expect(minRatingFromUrl(raw), raw).toBe(0);
    }
  });

  it("brak parametru = 0", () => {
    expect(minRatingFromUrl(null)).toBe(0);
    expect(minRatingFromUrl(undefined)).toBe(0);
  });

  it("każda opcja pola wraca z adresu bez zmian (to, co zapisuje select, strona odczytuje)", () => {
    for (const r of RATING_OPTIONS.filter((o) => o.value > 0)) {
      expect(minRatingFromUrl(String(r.value))).toBe(r.value);
    }
    expect(minRatingFromUrl("4.5")).toBe(4.5);
    expect(minRatingFromUrl("4.8")).toBe(4.8);
  });
});
