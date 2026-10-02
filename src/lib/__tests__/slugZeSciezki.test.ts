import { describe, expect, it } from "vitest";
import { kanonicznaSciezkaRegionu, kanonicznySlugKategorii, zlozSlug } from "@/lib/slugZeSciezki";
import { REGION_SLUGS, LEGACY_CITY_TO_REGION } from "@/data/regions";
import { getCategoryConfig } from "@/data/categoryPages";

/**
 * FMN-B83: /kategoria/ZOO i /śląskie kończyły się stroną „Nie znaleziono strony”,
 * choć /SLASKIE działało. Slug z adresu składamy do postaci z danych.
 */
const znanyRegion = (s: string) => REGION_SLUGS.includes(s) || Boolean(LEGACY_CITY_TO_REGION[s]);
const znanaKategoria = (s: string) => Boolean(getCategoryConfig(s));

describe("zlozSlug", () => {
  it("polskie znaki i wielkie litery → małe litery ASCII, ł ręcznie", () => {
    expect(zlozSlug("śląskie")).toBe("slaskie");
    expect(zlozSlug("Śląskie")).toBe("slaskie");
    expect(zlozSlug("ŁÓDZKIE")).toBe("lodzkie");
    expect(zlozSlug("Warmińsko-Mazurskie")).toBe("warminsko-mazurskie");
    expect(zlozSlug("Świętokrzyskie")).toBe("swietokrzyskie");
    expect(zlozSlug("ZOO")).toBe("zoo");
    expect(zlozSlug("Kraków")).toBe("krakow");
  });

  it("wynik jest punktem stałym (redirect się nie zapętli)", () => {
    for (const s of ["śląskie", "ŁÓDZKIE", "İstanbul", "ℌala", "zoo", "bzdura"]) {
      expect(zlozSlug(zlozSlug(s))).toBe(zlozSlug(s));
    }
  });

  it("każdy slug województwa i kategorii jest już złożony", () => {
    for (const s of REGION_SLUGS) expect(zlozSlug(s)).toBe(s);
    for (const s of ["sala-zabaw", "plac-zabaw", "park-rozrywki", "centra-rozrywki", "muzeum-teatr", "sport", "zoo", "park", "inne"]) {
      expect(zlozSlug(s)).toBe(s);
    }
  });
});

describe("kanonicznaSciezkaRegionu — /:region i /:region/:kategoria", () => {
  it("/śląskie → /slaskie, /SLASKIE → /slaskie, /Śląskie/ZOO → /slaskie/zoo", () => {
    expect(kanonicznaSciezkaRegionu("śląskie", undefined, znanyRegion)).toBe("/slaskie");
    expect(kanonicznaSciezkaRegionu("SLASKIE", undefined, znanyRegion)).toBe("/slaskie");
    expect(kanonicznaSciezkaRegionu("Śląskie", "ZOO", znanyRegion)).toBe("/slaskie/zoo");
    expect(kanonicznaSciezkaRegionu("slaskie", "ZOO", znanyRegion)).toBe("/slaskie/zoo");
  });

  it("stare miasto z polskimi znakami → slug miasta (dalej robi to przekierowanie miast)", () => {
    expect(kanonicznaSciezkaRegionu("Kraków", undefined, znanyRegion)).toBe("/krakow");
  });

  it("ścieżka kanoniczna albo nieznany region → bez przekierowania (404 zostaje)", () => {
    expect(kanonicznaSciezkaRegionu("slaskie", undefined, znanyRegion)).toBeNull();
    expect(kanonicznaSciezkaRegionu("slaskie", "bzdura", znanyRegion)).toBeNull();
    expect(kanonicznaSciezkaRegionu("Nieistnieje", undefined, znanyRegion)).toBeNull();
    expect(kanonicznaSciezkaRegionu("źle", "zoo", znanyRegion)).toBeNull();
    expect(kanonicznaSciezkaRegionu(undefined, undefined, znanyRegion)).toBeNull();
  });
});

describe("kanonicznySlugKategorii — /kategoria/:kategoria", () => {
  it("/kategoria/ZOO → zoo, /kategoria/Park-Rozrywki → park-rozrywki", () => {
    expect(kanonicznySlugKategorii("ZOO", znanaKategoria)).toBe("zoo");
    expect(kanonicznySlugKategorii("Park-Rozrywki", znanaKategoria)).toBe("park-rozrywki");
  });

  it("slug kanoniczny albo nieznany po złożeniu → null (404 zostaje)", () => {
    expect(kanonicznySlugKategorii("zoo", znanaKategoria)).toBeNull();
    expect(kanonicznySlugKategorii("BZDURA", znanaKategoria)).toBeNull();
    expect(kanonicznySlugKategorii(undefined, znanaKategoria)).toBeNull();
  });
});
