import { describe, expect, it } from "vitest";
import {
  adresSzukaniaZKarty,
  filtryZAdresuListy,
  filtryZeStanuKarty,
  okruszkiKarty,
  stanLinkuKarty,
} from "@/lib/kontekstListy";

/**
 * FMN-B54 (R2 = A): kafel listy niesie adres listy w stanie wpisu historii,
 * a karta buduje z niego okruszki i wyszukiwarkę. Zmierzone 26.09: 6/6 przejść
 * z karty gubiło wiek, kategorię i sort.
 */
const SCIEZKI_ZOO = { wojewodztwo: "/malopolskie", kategoria: "/malopolskie/zoo" };

describe("filtryZAdresuListy — filtry listy źródłowej", () => {
  it("„/”: region, kategorie, wiek, sort (most_reviewed -> reviews)", () => {
    expect(filtryZAdresuListy("/", "?region=malopolskie&age=3-5&type=zoo&sort=most_reviewed&view=map&lat=50")).toEqual({
      region: "malopolskie",
      typy: ["zoo"],
      wiek: "3-5",
      sort: "reviews",
    });
  });

  it("„/”: kilka kategorii, wielkie litery i półpauza w wieku jak w useActivityFilters", () => {
    expect(filtryZAdresuListy("/", "?region=Mazowieckie&type=zoo,Park,bzdura,zoo&age=6–9")).toEqual({
      region: "mazowieckie",
      typy: ["zoo", "park"],
      wiek: "6-9",
    });
  });

  it("/<woj>: województwo ze ścieżki, jedna kategoria z ?type=; min/free nie przechodzą", () => {
    expect(filtryZAdresuListy("/mazowieckie", "?age=6-9&type=zoo&min=4.5&sort=rating&free=1")).toEqual({
      region: "mazowieckie",
      typy: ["zoo"],
      wiek: "6-9",
      sort: "rating",
    });
  });

  it("/<woj>/<kat> i /atrakcje/<woj>/<kat>: kategoria ze ścieżki wygrywa z ?type=", () => {
    const oczek = { region: "mazowieckie", typy: ["sala-zabaw"], wiek: "3-5", sort: "name" };
    expect(filtryZAdresuListy("/mazowieckie/sala-zabaw", "?age=3-5&sort=name&type=zoo")).toEqual(oczek);
    expect(filtryZAdresuListy("/atrakcje/mazowieckie/sala-zabaw", "?age=3-5&sort=name")).toEqual(oczek);
  });

  it("/kategoria/<kat>: kategoria bez województwa", () => {
    expect(filtryZAdresuListy("/kategoria/zoo", "?age=3-5")).toEqual({ typy: ["zoo"], wiek: "3-5" });
  });

  it("nie-lista albo nic do przeniesienia = null", () => {
    expect(filtryZAdresuListy("/atrakcje/zoo-krakow", "?age=3-5")).toBeNull();
    expect(filtryZAdresuListy("/my-places", "")).toBeNull();
    expect(filtryZAdresuListy("/indeks/mazowieckie", "?age=3-5")).toBeNull();
    expect(filtryZAdresuListy("/", "")).toBeNull();
    expect(filtryZAdresuListy("/", "?age=99-100&sort=distance&region=atlantyda&search=zoo")).toBeNull();
    expect(filtryZAdresuListy("/", "?sort=constructor&type=__proto__")).toBeNull();
  });
});

describe("stan linku kafla i odczyt na karcie", () => {
  it("lista z filtrami -> stan z adresem listy; odczyt na karcie daje te same filtry", () => {
    const stan = stanLinkuKarty("/", "?region=malopolskie&age=3-5&type=zoo&sort=rating");
    expect(stan).toEqual({ ffZListy: "/?region=malopolskie&age=3-5&type=zoo&sort=rating" });
    expect(filtryZeStanuKarty(stan)).toEqual({ region: "malopolskie", typy: ["zoo"], wiek: "3-5", sort: "rating" });
  });

  it("lista bez filtrów i strona, która nie jest listą -> brak stanu (link jak dotąd)", () => {
    expect(stanLinkuKarty("/", "")).toBeUndefined();
    expect(stanLinkuKarty("/atrakcje/zoo-krakow", "")).toBeUndefined();
    expect(stanLinkuKarty("/inspiracje/ferie", "")).toBeUndefined();
  });

  it("brak, obcy albo uszkodzony stan wpisu = null", () => {
    expect(filtryZeStanuKarty(undefined)).toBeNull();
    expect(filtryZeStanuKarty(null)).toBeNull();
    expect(filtryZeStanuKarty({ ffListaOd: 2 })).toBeNull();
    expect(filtryZeStanuKarty({ ffZListy: 42 })).toBeNull();
    expect(filtryZeStanuKarty({ ffZListy: "https://zly.example/?age=3-5" })).toBeNull();
    expect(filtryZeStanuKarty({ ffZListy: "/mazowieckie" })).toEqual({ region: "mazowieckie" });
  });
});

describe("okruszkiKarty — adresy w słowniku strony docelowej", () => {
  it("bez listy (wejście z linku, Google, ctrl+klik): dzisiejsze adresy bez parametrów", () => {
    expect(okruszkiKarty(null, SCIEZKI_ZOO)).toEqual({ glowna: "/", ...SCIEZKI_ZOO });
  });

  it("z „/” z 4 filtrami: wiek i sort wszędzie, kategoria tam, gdzie okruszek jej nie ustala", () => {
    const f = filtryZAdresuListy("/", "?region=malopolskie&age=3-5&type=zoo&sort=most_reviewed");
    expect(okruszkiKarty(f, SCIEZKI_ZOO)).toEqual({
      glowna: "/?region=malopolskie&age=3-5&type=zoo&sort=most_reviewed",
      wojewodztwo: "/malopolskie?age=3-5&type=zoo&sort=reviews",
      kategoria: "/malopolskie/zoo?age=3-5&sort=reviews",
    });
  });

  it("ze strony województwa: min/free/amenities nie przechodzą", () => {
    const f = filtryZAdresuListy("/mazowieckie", "?age=6-9&type=zoo&min=4.5&sort=rating&free=1");
    expect(okruszkiKarty(f, { wojewodztwo: "/mazowieckie", kategoria: "/mazowieckie/zoo" })).toEqual({
      glowna: "/?region=mazowieckie&age=6-9&type=zoo&sort=rating",
      wojewodztwo: "/mazowieckie?age=6-9&type=zoo&sort=rating",
      kategoria: "/mazowieckie/zoo?age=6-9&sort=rating",
    });
  });

  it("kilka kategorii z „/”: okruszek województwa bez kategorii (strona regionu zna jedną)", () => {
    const f = filtryZAdresuListy("/", "?type=zoo,park&age=0-2");
    expect(okruszkiKarty(f, SCIEZKI_ZOO)).toEqual({
      glowna: "/?age=0-2&type=zoo%2Cpark",
      wojewodztwo: "/malopolskie?age=0-2",
      kategoria: "/malopolskie/zoo?age=0-2",
    });
  });

  it("kategoria spoza stron województw: /kategoria/<typ> dostaje wiek", () => {
    const f = filtryZAdresuListy("/", "?age=10-13");
    expect(okruszkiKarty(f, { wojewodztwo: "/slaskie", kategoria: "/kategoria/inne" }).kategoria).toBe(
      "/kategoria/inne?age=10-13",
    );
  });
});

describe("adresSzukaniaZKarty — wyszukiwarka w nagłówku karty", () => {
  it("bez listy: jak dotąd /?search=", () => {
    expect(adresSzukaniaZKarty("park linowy", null)).toBe("/?search=park%20linowy");
  });

  it("z listy: wiek i województwo listy, kategoria i sort nie przechodzą", () => {
    const f = filtryZAdresuListy("/", "?region=malopolskie&age=3-5&type=zoo&sort=rating");
    expect(adresSzukaniaZKarty("park", f)).toBe("/?region=malopolskie&age=3-5&search=park");
    const g = filtryZAdresuListy("/kategoria/zoo", "?age=3-5");
    expect(adresSzukaniaZKarty("park linowy", g)).toBe("/?age=3-5&search=park+linowy");
  });
});
