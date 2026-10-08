import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// AF-10-009/010/011/012/014: spojna typografia i terminy w napisach UI.
//  - polski cudzyslow „…” zamykany ”, nie prostym " (takze w regulaminie i polityce),
//  - wielokropek jednym znakiem „…”, nie trzema kropkami,
//  - jedno slowo na stan ladowania: rdzen „wczyt*” (Wczytywanie…, Wczytuję…), bez „Ładowanie”,
//  - bez anglicyzmow typu „bucket lista”,
//  - pisownia „e-mail”, nie „email” (poza adresami i nazwa wlasna uslugi „Email Routing”).
// Skan statyczny src/ (bez testow, panelu admina i lib/mcp) - jak bramka audytu AF-10.
// TYPOGRAFIA_SRC pozwala wskazac inny katalog src (kontrola mutacji na starym kodzie).
const SRC = process.env.TYPOGRAFIA_SRC ?? resolve(__dirname, "../..");

type Plik = { f: string; t: string };
type Napis = { f: string; l: number; s: string; jsx: boolean };

function pliki(dir: string, out: Plik[] = []): Plik[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (["__tests__", "test", "integrations"].includes(e.name)) continue;
      pliki(p, out);
    } else if (/\.(tsx?|jsx?)$/.test(e.name) && !/\.(test|spec)\./.test(e.name) && !e.name.endsWith(".d.ts")) {
      const f = relative(SRC, p).split("\\").join("/");
      if (f.startsWith("pages/admin/") || f.startsWith("lib/mcp/") || f === "components/LayoutDiagnostics.tsx") continue;
      out.push({ f, t: readFileSync(p, "utf8") });
    }
  }
  return out;
}

// Komentarze zastapione spacjami (pozycje i numery linii bez zmian).
const bezKomentarzy = (t: string) =>
  t
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (m, a: string) => a + " ".repeat(m.length - a.length));
const linia = (t: string, i: number) => t.slice(0, i).split("\n").length;
const PL = /[ąćęłńóśźż]/i;

/** Kazdy „ musi byc zamkniety ” przed ", “, kolejnym „ albo koncem linii; wyrazenia {…}/${…} w srodku pomijane. */
function zleCudzyslowy(lista: Plik[]): string[] {
  const zle: string[] = [];
  for (const { f, t: raw } of lista) {
    const t = bezKomentarzy(raw);
    for (let i = t.indexOf("„"); i >= 0; i = t.indexOf("„", i + 1)) {
      const prev = t[i - 1];
      if ((prev === '"' || prev === "'" || prev === "`") && t[i + 1] === prev) continue; // napis z samym „
      let j = i + 1;
      while (j < t.length && !'”“"„\n'.includes(t[j])) {
        if (t[j] === "{") {
          let gl = 1;
          j++;
          while (j < t.length && gl > 0) {
            if (t[j] === "{") gl++;
            else if (t[j] === "}") gl--;
            j++;
          }
          continue;
        }
        j++;
      }
      if (t[j] !== "”") zle.push(`${f}:${linia(t, i)}`);
    }
  }
  return zle;
}

// Napisy: tekst JSX miedzy znacznikami (jsx) i literaly "..."/'...'/`...` z polskimi znakami albo w JSX-owym atrybucie.
function napisy(lista: Plik[]): Napis[] {
  const w: Napis[] = [];
  for (const { f, t: raw } of lista) {
    const t = bezKomentarzy(raw);
    for (const m of t.matchAll(/>([^<>{}=]*[^<>{}=\s][^<>{}=]*)</g))
      w.push({ f, l: linia(t, m.index ?? 0), s: m[1].replace(/\s+/g, " ").trim(), jsx: true });
    for (const m of t.matchAll(/(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g)) w.push({ f, l: linia(t, m.index ?? 0), s: m[2], jsx: false });
  }
  return w;
}
const uzytkownika = (lista: Plik[]) => napisy(lista).filter((x) => x.jsx || PL.test(x.s) || /\s/.test(x.s));
const opis = (x: Napis) => `${x.f}:${x.l} ${x.s.slice(0, 40)}`;

function trzyKropki(lista: Plik[]): string[] {
  return uzytkownika(lista).filter((x) => /[a-ząćęłńóśźż]\.\.\.(?!\.)/i.test(x.s)).map(opis);
}

function ladowanie(lista: Plik[]): string[] {
  return uzytkownika(lista).filter((x) => /^(?:trwa\s+)?ładowani/i.test(x.s.trim())).map(opis);
}

function anglicyzmy(lista: Plik[]): string[] {
  return uzytkownika(lista)
    .filter((x) => x.jsx || PL.test(x.s))
    .filter((x) => /\b(bucket|wishlist|check-?in|feed|sorry|wow|hello|cool)\b/i.test(x.s.replace(/\$\{[^}]*\}/g, " ")))
    .map(opis);
}

function emailBezMyslnika(lista: Plik[]): string[] {
  return uzytkownika(lista)
    .filter((x) => (x.jsx || PL.test(x.s)) && !/@/.test(x.s))
    .filter((x) => /(^|[^@\w.-])[Ee]mail\b/.test(x.s.replace(/\bEmail Routing\b/g, " ")))
    .map(opis);
}

describe("typografia i terminy napisow UI (AF-10-009/010/011/012/014)", () => {
  const src = pliki(SRC);

  it("skan widzi pliki UI (regulamin, polityka, formularze)", () => {
    const f = src.map((p) => p.f);
    expect(f).toEqual(expect.arrayContaining(["pages/Regulamin.tsx", "pages/PolitykaPrywatnosci.tsx", "components/ReportIssueButton.tsx"]));
  });

  it("detektory lapia zepsute napisy (kontrola pozytywna)", () => {
    const zepsuty: Plik[] = [
      {
        f: "components/Zepsuty.tsx",
        t: [
          "<p>(dalej: „Serwis\")</p>",
          "<span>Ładowanie...</span>",
          "<p>Twoja rodzinna bucket lista!</p>",
          "<label>Twój email (jeśli mamy odpisać)</label>",
          "const a = `początek: „${(t || \"\").slice(0, 8)}”`;",
          "<h2>Email</h2>",
          "<li>Cloudflare (Turnstile, Email Routing)</li>",
        ].join("\n"),
      },
    ];
    expect(zleCudzyslowy(zepsuty)).toEqual(["components/Zepsuty.tsx:1"]);
    expect(trzyKropki(zepsuty)).toHaveLength(1);
    expect(ladowanie(zepsuty)).toHaveLength(1);
    expect(anglicyzmy(zepsuty)).toHaveLength(1);
    expect(emailBezMyslnika(zepsuty)).toEqual(["components/Zepsuty.tsx:4 Twój email (jeśli mamy odpisać)", "components/Zepsuty.tsx:6 Email"]);
  });

  it("„…” zamykane ” — 0 par z prostym cudzyslowem", () => {
    expect(zleCudzyslowy(src)).toEqual([]);
  });

  it("wielokropek jednym znakiem — 0 napisow z trzema kropkami", () => {
    expect(trzyKropki(src)).toEqual([]);
  });

  it("stan ladowania jednym slowem (wczyt*) — 0 napisow „Ładowanie…”", () => {
    expect(ladowanie(src)).toEqual([]);
  });

  it("bez anglicyzmow w polskich zdaniach", () => {
    expect(anglicyzmy(src)).toEqual([]);
  });

  it("pisownia „e-mail” — 0 polskich napisow z „email”", () => {
    expect(emailBezMyslnika(src)).toEqual([]);
  });
});
