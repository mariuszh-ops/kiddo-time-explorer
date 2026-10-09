import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import defaultTheme from "tailwindcss/defaultTheme";

// AF-7-008: na telefonie 100vh (Tailwind h-screen / min-h-screen) to wysokosc ekranu przy
// SCHOWANYM pasku adresu (iOS Safari, Chrome Android). Przy widocznym pasku dol strony
// (tryb mapy, stopka, wysrodkowana tresc) lezal pod paskiem. Strony publiczne licza wysokosc
// z jednostek dynamicznych/malych: dvh dla stalej wysokosci, svh dla min-height.
// WYSOKOSC_SRC pozwala wskazac inny katalog src (kontrola mutacji na starym kodzie).
const SRC = process.env.WYSOKOSC_SRC ?? resolve(__dirname, "../..");

type Plik = { f: string; t: string };
function pliki(dir: string, out: Plik[] = []): Plik[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (["__tests__", "test", "assets"].includes(e.name)) continue;
      pliki(p, out);
    } else if (/\.(tsx?|css)$/.test(e.name) && !/\.(test|spec)\./.test(e.name) && !e.name.endsWith(".d.ts")) {
      const t = readFileSync(p, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
      out.push({ f: relative(SRC, p).split("\\").join("/"), t });
    }
  }
  return out;
}

describe("wysokosc ekranu w stronach publicznych (AF-7-008)", () => {
  const P = pliki(SRC).filter((x) => !x.f.startsWith("pages/admin/") && !x.f.startsWith("components/ui/"));
  const plik = (f: string) => P.find((x) => x.f === f)?.t ?? "";

  it("0 x h-screen / min-h-screen / max-h-screen / 100vh poza components/ui i /admin", () => {
    const trafienia: string[] = [];
    for (const x of P) {
      x.t.split("\n").forEach((l, i) => {
        if (/(?<![\w])(?:min-|max-)?h-screen\b|\b100vh\b/.test(l)) trafienia.push(`${x.f}:${i + 1}`);
      });
    }
    expect(P.length).toBeGreaterThan(100);
    expect(trafienia).toEqual([]);
  });

  it("tryb mapy i mapa na komputerze: stala wysokosc z dvh; min-height stron z svh", () => {
    const idx = plik("pages/Index.tsx");
    expect(idx).toContain("h-[calc(100dvh-var(--header-h,72px))] overflow-hidden");
    expect(idx).toContain("min-h-[calc(100svh-var(--header-h,72px))]");
    expect(plik("components/MapView.tsx")).toContain('height: "calc(100dvh - 64px - 52px)"');
    expect(plik("components/MapViewSkeleton.tsx")).toContain('height: "calc(100dvh - 56px)"');
    const nSvh = P.reduce((n, x) => n + (x.t.match(/\bmin-h-svh\b/g) ?? []).length, 0);
    expect(nSvh).toBeGreaterThanOrEqual(21);
  });

  it("Tailwind zna min-h-svh (bez tego klasa nie wygeneruje CSS i strona straci min-height)", () => {
    const minHeight = defaultTheme.minHeight as unknown as (a: { theme: () => object }) => Record<string, string>;
    expect(minHeight({ theme: () => ({}) }).svh).toBe("100svh");
  });
});
