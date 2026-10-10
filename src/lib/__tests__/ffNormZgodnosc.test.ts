import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeSearchText, tokenizeQuery } from "@/lib/searchTokens";

/**
 * FMN-B93: normalizacja frazy w przeglądarce (`normalizeSearchText`) i w bazie
 * (`public.ff_norm`) muszą dawać to samo dla liter łacińskich. Inaczej słowo
 * „variete” z przeglądarki nigdy nie trafi w „variété” w bazie (zmierzone na prod:
 * 7 rekordów nie do znalezienia na „/”).
 *
 * Ten test czyta mapę liter WPROST z migracji (to, co właściciel wgrywa w SQL
 * Editor) i porównuje ją z funkcją przeglądarki. Zmiana jednej strony bez drugiej
 * wywraca test.
 */
const MIGRACJA = resolve(
  __dirname,
  "../../../supabase/migrations/20261010150000_fmn_b93_ff_norm_wszystkie_akcenty.sql",
);

/** Łączy literały `'a' || 'b' || ...` w jeden tekst. */
const sklej = (wyrazenie: string): string =>
  [...wyrazenie.matchAll(/'([^']*)'/g)].map((m) => m[1]).join("");

function mapaZMigracji() {
  const sql = readFileSync(MIGRACJA, "utf-8");
  const cialo = sql.split("as $fn$")[1].split("$fn$;")[0];
  // Szybka droga: translate(lower(coalesce(p_text, '')), 'ąćęłńóśźż', 'acelnoszz')
  const szybka = /then translate\(lower\(coalesce\(p_text, ''\)\), '([^']*)', '([^']*)'\)/.exec(cialo);
  // Pełna mapa: else translate(lower(p_text), <z>, <na>)
  const pelna = /else translate\(lower\(p_text\),\s*([\s\S]*?),\s*('acelnoszz'[\s\S]*?)\)\s*end;/.exec(cialo);
  const regex = /!~ '([^']*)'/.exec(cialo);
  if (!szybka || !pelna || !regex) throw new Error("Nie rozpoznaję ciała ff_norm w migracji");
  return {
    szybkaZ: szybka[1],
    szybkaNa: szybka[2],
    z: Array.from(sklej(pelna[1])),
    na: Array.from(sklej(pelna[2])),
    // Postgres ARE: \uXXXX → znak; w JS to samo znaczy flaga `u`.
    bramka: new RegExp(regex[1], "u"),
  };
}

/** Odpowiednik nowej ff_norm w JS — 1:1 z ciałem funkcji z migracji. */
function ffNormJakWBazie(tekst: string | null): string {
  const { szybkaZ, szybkaNa, z, na, bramka } = mapaZMigracji();
  const t = tekst ?? "";
  const tlumacz = (s: string, odZ: string[], naZ: string[]) =>
    Array.from(s.toLowerCase())
      .map((c) => {
        const i = odZ.indexOf(c);
        return i >= 0 ? naZ[i] : c;
      })
      .join("");
  return bramka.test(t) ? tlumacz(t, z, na) : tlumacz(t, Array.from(szybkaZ), Array.from(szybkaNa));
}

describe("ff_norm (migracja B93) = normalizeSearchText (przeglądarka)", () => {
  it("mapa jest kompletna: tyle samo liter po obu stronach", () => {
    const { z, na } = mapaZMigracji();
    expect(z.length).toBe(na.length);
    expect(z.length).toBe(9 + 243);
    expect(new Set(z).size).toBe(z.length); // bez duplikatów
  });

  it("każda litera z mapy bazy daje to samo co przeglądarka", () => {
    const { z, na } = mapaZMigracji();
    const rozne = z.filter((c, i) => normalizeSearchText(c) !== na[i]);
    expect(rozne).toEqual([]);
  });

  it("każda litera łacińska, którą przeglądarka zmienia, jest w mapie bazy", () => {
    const { z } = mapaZMigracji();
    const wMapie = new Set(z);
    const brakujace: string[] = [];
    for (const [od, doCp] of [
      [0x00c0, 0x024f],
      [0x1e00, 0x1eff],
    ]) {
      for (let cp = od; cp <= doCp; cp++) {
        const c = String.fromCodePoint(cp);
        if (c.toLowerCase() !== c) continue; // wielkie litery zdejmuje lower() w bazie
        const n = normalizeSearchText(c);
        if (n !== c && Array.from(n).length === 1 && !wMapie.has(c)) brakujace.push(c);
      }
    }
    expect(brakujace).toEqual([]);
  });

  it("7 rekordów z FMN-B93 + polskie + interpunkcja/emoji: baza = przeglądarka", () => {
    for (const s of [
      "Krakowski Teatr Variété",
      "Teatr Cortiqué Anny Niedźwiedź",
      "Teatr Powszechny im. Zygmunta Hübnera",
      "Kamień ku czci Heinricha Rübartscha",
      "Bunkry Blüchera",
      "Muzeum Etnograficzne im. Marii Znamierowskiej-Prüfferowej w Toruniu",
      "Stajnia Fiesta Raszòw",
      "Zażółć GĘŚLĄ jaźń, ŁÓDŹ",
      "Bacówka „Barankowa” – 1000m² 🌟",
      "ÀÉÎÕÜ Çà Ñandú Šťastný Øresund Ærø Straße ǖ Ḁ ỹ",
    ]) {
      expect(ffNormJakWBazie(s), s).toBe(normalizeSearchText(s));
    }
    expect(ffNormJakWBazie(null)).toBe("");
  });

  it("szybka droga (ASCII + polskie) = stara ff_norm sprzed migracji", () => {
    const stara = (s: string) =>
      Array.from(s.toLowerCase())
        .map((c) => {
          const i = "ąćęłńóśźż".indexOf(c);
          return i >= 0 ? "acelnoszz"[i] : c;
        })
        .join("");
    for (const s of ["Zoo Wrocław", "Sala zabaw ŁÓDŹ", "Park Linowy – Zator", "Kraków 2026"]) {
      expect(ffNormJakWBazie(s), s).toBe(stara(s));
    }
  });
});

describe("normalizeSearchText / tokenizeQuery — przypadki z FMN-B93", () => {
  it("zdejmuje akcenty spoza polskiego alfabetu", () => {
    expect(normalizeSearchText("Variété")).toBe("variete");
    expect(normalizeSearchText("Hübnera")).toBe("hubnera");
    expect(normalizeSearchText("Cortiqué")).toBe("cortique");
    expect(normalizeSearchText("Raszòw")).toBe("raszow");
    expect(normalizeSearchText("Prüfferowej")).toBe("prufferowej");
  });

  it("polskie litery jak dotąd", () => {
    expect(normalizeSearchText("Zażółć gęślą jaźń ŁÓDŹ")).toBe("zazolc gesla jazn lodz");
  });

  it("tokeny: słowa po białych znakach, bez akcentów", () => {
    expect(tokenizeQuery("  Teatr   Variété ")).toEqual(["teatr", "variete"]);
    expect(tokenizeQuery("sala zabaw")).toEqual(["sala", "zabaw"]);
    expect(tokenizeQuery("   ")).toEqual([]);
  });
});
