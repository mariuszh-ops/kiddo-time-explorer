import { describe, expect, it } from "vitest";
import { kanonicznaSciezkaAtrakcji } from "@/lib/slugZeSciezki";
import { LEGACY_CITY_TO_REGION } from "@/data/regions";

/**
 * GL-6-012/013/016: /atrakcje/Mazowieckie, /atrakcje/<Slug-Z-Wielkich> i
 * /atrakcje/Łódź kończyły się stroną 404, choć /Mazowieckie i /Łódź działały.
 */
const sciezka = (slug: string | undefined) => kanonicznaSciezkaAtrakcji(slug, LEGACY_CITY_TO_REGION);

describe("kanonicznaSciezkaAtrakcji", () => {
  it("województwo z wielkiej litery → slug kanoniczny", () => {
    expect(sciezka("Mazowieckie")).toBe("/atrakcje/mazowieckie");
    expect(sciezka("Śląskie")).toBe("/atrakcje/slaskie");
  });

  it("slug karty z wielkich liter → małe litery", () => {
    expect(sciezka("Centrum-Nauki-Kopernik-Warszawa")).toBe("/atrakcje/centrum-nauki-kopernik-warszawa");
  });

  it("stare miasto z polskimi znakami → województwo jednym skokiem", () => {
    expect(sciezka("Łódź")).toBe("/atrakcje/lodzkie");
    expect(sciezka("Kraków")).toBe("/atrakcje/malopolskie");
    expect(sciezka("Warszawa")).toBe("/atrakcje/mazowieckie");
  });

  it("stare miasto małymi literami → województwo (jak dotąd)", () => {
    expect(sciezka("warszawa")).toBe("/atrakcje/mazowieckie");
  });

  it("slug kanoniczny → bez przekierowania (brak pętli)", () => {
    expect(sciezka("mazowieckie")).toBeNull();
    expect(sciezka("centrum-nauki-kopernik-warszawa")).toBeNull();
    expect(sciezka(undefined)).toBeNull();
    for (const s of ["Mazowieckie", "Łódź", "Centrum-Nauki-Kopernik-Warszawa", "Nieznany-Slug"]) {
      const cel = sciezka(s)!.replace("/atrakcje/", "");
      expect(sciezka(cel)).toBeNull();
    }
  });

  it("nieznany slug z wielkich liter → małe litery, dalej 404 na karcie", () => {
    expect(sciezka("Nieznany-Slug")).toBe("/atrakcje/nieznany-slug");
  });

  it("klucz z prototypu obiektu nie udaje starego miasta", () => {
    expect(sciezka("constructor")).toBeNull();
    expect(sciezka("toString")).toBe("/atrakcje/tostring");
  });
});
