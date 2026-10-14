import { describe, it, expect } from "vitest";
import { tokenizeQuery } from "@/lib/searchTokens";

/**
 * AN-4-029: fraza z interpunkcją dawała 0 wyników na „/”, liście regionu i mapie,
 * bo słowo z przyklejonym znakiem („zoo.”, „krakow,”) szło do `ff_home_match`
 * jako podciąg (LIKE '%zoo.%'). Zmierzone na prod 13.10: „zoo.” = 0 zamiast 310,
 * „Kraków, zoo” w małopolskim = 0 zamiast 6.
 *
 * Interpunkcja dzieli słowa tak jak spacja — z wyjątkiem łącznika `-`, który
 * zostaje w słowie („Bielsko-Biała”, „Rabka-Zdrój” mają go też w danych).
 */
describe("tokenizeQuery — interpunkcja dzieli słowa (AN-4-029)", () => {
  it("kropka, przecinek, nawiasy i cudzysłowy nie przyklejają się do słowa", () => {
    expect(tokenizeQuery("zoo.")).toEqual(["zoo"]);
    expect(tokenizeQuery("Kraków, zoo")).toEqual(["krakow", "zoo"]);
    expect(tokenizeQuery("Kraków,zoo")).toEqual(["krakow", "zoo"]);
    expect(tokenizeQuery("(zoo)")).toEqual(["zoo"]);
    expect(tokenizeQuery('"zoo"')).toEqual(["zoo"]);
    expect(tokenizeQuery("„Zoo” w Krakowie!")).toEqual(["zoo", "w", "krakowie"]);
    expect(tokenizeQuery("zoo; park: sala?")).toEqual(["zoo", "park", "sala"]);
    expect(tokenizeQuery("Kraków/Wieliczka")).toEqual(["krakow", "wieliczka"]);
  });

  it("fraza z interpunkcją daje te same słowa co ta sama fraza bez niej", () => {
    expect(tokenizeQuery("Kraków, zoo.")).toEqual(tokenizeQuery("Kraków zoo"));
    expect(tokenizeQuery("zoo, park")).toEqual(tokenizeQuery("zoo park"));
  });

  it("łącznik `-` zostaje w słowie, inne kreski dzielą", () => {
    expect(tokenizeQuery("Bielsko-Biała")).toEqual(["bielsko-biala"]);
    expect(tokenizeQuery("Rabka-Zdrój")).toEqual(["rabka-zdroj"]);
    expect(tokenizeQuery("Bielsko–Biała")).toEqual(["bielsko", "biala"]);
  });

  it("sama interpunkcja = brak słów (jak pusta fraza)", () => {
    expect(tokenizeQuery("...")).toEqual([]);
    expect(tokenizeQuery(" , ")).toEqual([]);
    expect(tokenizeQuery("%")).toEqual([]);
  });

  it("bez zmian dla zwykłych fraz i symboli spoza interpunkcji", () => {
    expect(tokenizeQuery("  Teatr   Variété ")).toEqual(["teatr", "variete"]);
    expect(tokenizeQuery("sala zabaw")).toEqual(["sala", "zabaw"]);
    expect(tokenizeQuery("🦁")).toEqual(["🦁"]);
  });
});
