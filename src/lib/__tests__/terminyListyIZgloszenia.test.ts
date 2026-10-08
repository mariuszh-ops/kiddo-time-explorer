import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// AF-10-015/016: spojne terminy w napisach UI.
//  - /my-places (MyPlaces.tsx): co najwyzej 2 okreslenia listy z {ulubion*, zapisan*, moje miejsca}; zakladka „Ulubione”
//    zostaje, nazwa strony = etykieta linku w Header („Moje miejsca”) w h1 i w tytule SEO;
//  - formularz zgloszenia miejsca: jedna etykieta akcji w calym UI (takze w zdaniach i w panelu admina) = „Zgłoś atrakcję”
//    (tytul formularza i nazwa uzywana w polityce prywatnosci).
// Skan statyczny src/ (bez testow, lib/mcp) - jak bramka audytu AF-10. TERMINY_SRC pozwala wskazac inny katalog src
// (kontrola mutacji na starym kodzie).
const SRC = process.env.TERMINY_SRC ?? resolve(__dirname, "../..");

type Plik = { f: string; t: string };

function pliki(dir: string, out: Plik[] = []): Plik[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (["__tests__", "test", "integrations"].includes(e.name)) continue;
      pliki(p, out);
    } else if (/\.(tsx?|jsx?)$/.test(e.name) && !/\.(test|spec)\./.test(e.name) && !e.name.endsWith(".d.ts")) {
      const f = relative(SRC, p).split("\\").join("/");
      if (f.startsWith("lib/mcp/") || f === "components/LayoutDiagnostics.tsx") continue;
      out.push({ f, t: readFileSync(p, "utf8") });
    }
  }
  return out;
}

const bezKomentarzy = (t: string) =>
  t
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (m, a: string) => a + " ".repeat(m.length - a.length));
const linia = (t: string, i: number) => t.slice(0, i).split("\n").length;

// Napisy: tekst JSX miedzy znacznikami i literaly "..."/'...'/`...`.
function napisy(lista: Plik[]): Array<{ f: string; l: number; s: string }> {
  const w: Array<{ f: string; l: number; s: string }> = [];
  for (const { f, t: raw } of lista) {
    const t = bezKomentarzy(raw);
    for (const m of t.matchAll(/>([^<>{}=]*[^<>{}=\s][^<>{}=]*)</g)) w.push({ f, l: linia(t, m.index ?? 0), s: m[1].replace(/\s+/g, " ").trim() });
    for (const m of t.matchAll(/(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g)) w.push({ f, l: linia(t, m.index ?? 0), s: m[2] });
  }
  return w;
}

const FRAZA = /\b(dodaj|zgłoś|zaproponuj)( nowe| nową)? (miejsce|atrakcję)(?![\wąćęłńóśźż])/gi;
function etykietyZgloszenia(lista: Plik[]): string[] {
  const s = new Set<string>();
  for (const x of napisy(lista)) for (const m of x.s.matchAll(FRAZA)) s.add(m[0].toLowerCase());
  return [...s].sort();
}

function okresleniaListy(mp: string): string[] {
  const s = new Set<string>();
  for (const x of napisy([{ f: "pages/MyPlaces.tsx", t: mp }])) {
    if (/ulubion/i.test(x.s)) s.add("ulubione");
    if (/zapisan/i.test(x.s)) s.add("zapisane");
    if (/moje miejsca|moje zapisane miejsca/i.test(x.s)) s.add("moje miejsca");
  }
  return [...s].sort();
}

const h1 = (t: string) => [...bezKomentarzy(t).matchAll(/<h1\b[^>]*>([^<{]*)<\/h1>/g)].map((m) => m[1].replace(/\s+/g, " ").trim());
const seoTitle = (t: string) => [...bezKomentarzy(t).matchAll(/<SEOHead\s+title="([^"]*)"/g)].map((m) => m[1]);
const navMyPlaces = (t: string) =>
  [...new Set([...bezKomentarzy(t).matchAll(/<Link to="\/my-places"[^>]*>([\s\S]*?)<\/Link>/g)].map((m) =>
    m[1].replace(/<[^>]*>/g, " ").replace(/\{[^}]*\}/g, " ").replace(/\s+/g, " ").trim(),
  ))];

describe("terminy UI: lista na /my-places i akcja zgloszenia miejsca (AF-10-015/016)", () => {
  const src = pliki(SRC);
  const plik = (f: string) => src.find((p) => p.f === f)?.t ?? "";

  it("skan widzi pliki (MyPlaces, Header, stopka, formularz, admin)", () => {
    expect(src.map((p) => p.f)).toEqual(
      expect.arrayContaining(["pages/MyPlaces.tsx", "components/Header.tsx", "components/Footer.tsx", "components/SubmitActivityModal.tsx", "pages/admin/AdminPropozycje.tsx"]),
    );
  });

  it("detektory lapia zepsute napisy (kontrola pozytywna)", () => {
    const zepsuty: Plik[] = [{ f: "components/Z.tsx", t: "<button>Dodaj nowe miejsce</button>\n<p>Zgłoś atrakcję</p>\nconst x = \"Dodaj atrakcję\";" }];
    expect(etykietyZgloszenia(zepsuty)).toEqual(["dodaj atrakcję", "dodaj nowe miejsce", "zgłoś atrakcję"]);
    expect(okresleniaListy("<h1>Moje miejsca</h1>\n<p>Twoje zapisane atrakcje</p>\n<span>Ulubione</span>")).toEqual(["moje miejsca", "ulubione", "zapisane"]);
    expect(h1("<h1 className=\"a\">\n  Moje miejsca\n</h1>")).toEqual(["Moje miejsca"]);
  });

  it("formularz zgloszenia ma jedna nazwe w calym UI: „Zgłoś atrakcję”", () => {
    expect(etykietyZgloszenia(src)).toEqual(["zgłoś atrakcję"]);
  });

  it("/my-places: co najwyzej 2 okreslenia listy, bez „zapisane”", () => {
    const o = okresleniaListy(plik("pages/MyPlaces.tsx"));
    expect(o.length).toBeLessThanOrEqual(2);
    expect(o).not.toContain("zapisane");
  });

  it("/my-places: h1 (gosc i zalogowany) i tytul SEO = etykieta linku w nagłówku", () => {
    const nav = navMyPlaces(plik("components/Header.tsx"));
    expect(nav).toEqual(["Moje miejsca"]);
    const naglowki = h1(plik("pages/MyPlaces.tsx"));
    expect(naglowki.length).toBeGreaterThanOrEqual(2);
    expect(new Set(naglowki)).toEqual(new Set(nav));
    const tytuly = seoTitle(plik("pages/MyPlaces.tsx"));
    expect(tytuly.length).toBeGreaterThanOrEqual(1);
    expect(new Set(tytuly)).toEqual(new Set(nav));
  });
});
