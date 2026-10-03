import { describe, expect, it } from "vitest";
import { FRAZA_Z_ADRESU_MAX, frazaZAdresu, sanitizeSearchTerm } from "@/lib/searchConfig";

describe("frazaZAdresu (FMN-8-021)", () => {
  it("zwykła fraza bez zmian, bez spacji na brzegach", () => {
    expect(frazaZAdresu("  park linowy ")).toBe("park linowy");
    expect(frazaZAdresu("łódź")).toBe("łódź");
  });

  it("brak parametru = pusta fraza", () => {
    expect(frazaZAdresu(null)).toBe("");
    expect(frazaZAdresu(undefined)).toBe("");
    expect(frazaZAdresu("   ")).toBe("");
  });

  it("2000 × „ą” z adresu = 100 znaków, a zapytanie PostgREST zostaje krótkie", () => {
    const z = new URLSearchParams("search=" + encodeURIComponent("ą".repeat(2000)));
    const fraza = frazaZAdresu(z.get("search"));
    expect(FRAZA_Z_ADRESU_MAX).toBe(100);
    expect(fraza).toBe("ą".repeat(100));
    // fraza idzie dwa razy do or(name.ilike…,city.ilike…), każda „ą” = 6 znaków w adresie
    const term = sanitizeSearchTerm(fraza);
    expect(encodeURIComponent(`name.ilike.%${term}%,city.ilike.%${term}%`).length).toBeLessThan(2000);
  });

  it("fraza dokładnie na limicie zostaje cała", () => {
    const f = "a".repeat(FRAZA_Z_ADRESU_MAX);
    expect(frazaZAdresu(f)).toBe(f);
    expect(frazaZAdresu(f + "b")).toBe(f);
  });

  it("nie rozcina emoji (liczy punkty kodowe, nie jednostki UTF-16)", () => {
    const f = "a".repeat(FRAZA_Z_ADRESU_MAX - 1) + "🦁🦁";
    const wynik = frazaZAdresu(f);
    expect(Array.from(wynik)).toHaveLength(FRAZA_Z_ADRESU_MAX);
    expect(wynik.endsWith("🦁")).toBe(true);
  });

  it("po obcięciu bez spacji na końcu", () => {
    expect(frazaZAdresu("a".repeat(FRAZA_Z_ADRESU_MAX - 1) + " bbb")).toBe("a".repeat(FRAZA_Z_ADRESU_MAX - 1));
  });
});
