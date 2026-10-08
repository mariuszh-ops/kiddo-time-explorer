import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { activityCount, formatCountPl } from "@/lib/plural";

// AF-10-053: liczby >= 1000 w licznikach atrakcji z separatorem tysiecy (twarda spacja U+00A0),
// takze czterocyfrowe („1 533 atrakcje”, „Pokaż wyniki (4 883)”), a nie „1533 atrakcje”.
const NB = String.fromCharCode(0xa0);

vi.mock("@/hooks/useTopActivities", () => ({ useCatalogTotal: () => 4883 }));
vi.mock("@/hooks/useActivitiesInfinite", () => ({
  useActivitiesInfinite: () => ({
    data: Array.from({ length: 24 }, (_, i) => ({ id: String(i) })),
    total: 4883,
    loading: false,
    loadingMore: false,
    hasMore: true,
    error: null,
    loadMore: () => {},
    refetch: () => {},
  }),
}));
vi.mock("@/components/ActivityGrid", () => ({ default: () => null }));

import HeroSection from "@/components/HeroSection";
import AllActivitiesListing from "@/components/AllActivitiesListing";

describe("formatCountPl", () => {
  it("grupuje po 3 cyfry twarda spacja, takze liczby czterocyfrowe", () => {
    expect(formatCountPl(0)).toBe("0");
    expect(formatCountPl(7)).toBe("7");
    expect(formatCountPl(999)).toBe("999");
    expect(formatCountPl(1000)).toBe(`1${NB}000`);
    expect(formatCountPl(1533)).toBe(`1${NB}533`);
    expect(formatCountPl(4883)).toBe(`4${NB}883`);
    expect(formatCountPl(12345)).toBe(`12${NB}345`);
    expect(formatCountPl(1234567)).toBe(`1${NB}234${NB}567`);
    expect(formatCountPl(-1533)).toBe(`-1${NB}533`);
  });

  it("nie rusza liczb niecalkowitych (to nie formater ulamkow)", () => {
    expect(formatCountPl(1234.5)).toBe("1234.5");
    expect(formatCountPl(Number.NaN)).toBe("NaN");
  });

  it("activityCount: twarda spacja tylko w liczbie, zwykla spacja przed slowem, odmiana bez zmian", () => {
    expect(activityCount(1)).toBe("1 atrakcja");
    expect(activityCount(22)).toBe("22 atrakcje");
    expect(activityCount(112)).toBe("112 atrakcji");
    expect(activityCount(1533)).toBe(`1${NB}533 atrakcje`);
    expect(activityCount(4883)).toBe(`4${NB}883 atrakcje`);
    expect(activityCount(5000)).toBe(`5${NB}000 atrakcji`);
  });
});

describe("render licznikow >= 1000", () => {
  it("HeroSection: zaokraglony licznik z separatorem i plusem", () => {
    const { container } = render(<HeroSection onExplore={() => {}} />);
    const teksty = [...container.querySelectorAll("p")].map((p) => p.textContent);
    expect(teksty).toContain(`4${NB}850+ atrakcji z ocenami Google`);
  });

  it("AllActivitiesListing (/?all=1): licznik i „Pokaż więcej” z separatorem", () => {
    render(
      <MemoryRouter>
        <AllActivitiesListing />
      </MemoryRouter>,
    );
    expect(screen.getByRole("status").textContent).toBe(`4${NB}883 atrakcje`);
    expect(screen.getByRole("button", { name: `Pokaż więcej (4${NB}859)` })).toBeTruthy();
  });
});

// Straz na przyszlosc: licznik katalogu nie moze trafic do UI jako surowa liczba obok slowa
// „atrakcja/atrakcje/atrakcji” ani w nawiasie przyciskow „Pokaż więcej/wyniki (N)”.
// LICZNIKI_SRC pozwala wskazac inny katalog src (kontrola mutacji na starym kodzie).
const SRC = process.env.LICZNIKI_SRC ?? resolve(__dirname, "../..");
function pliki(dir: string, out: { f: string; t: string }[] = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (["__tests__", "test", "integrations"].includes(e.name)) continue;
      pliki(p, out);
    } else if (/\.tsx?$/.test(e.name) && !/\.(test|spec)\./.test(e.name) && !e.name.endsWith(".d.ts")) {
      const f = relative(SRC, p).split("\\").join("/");
      if (f.startsWith("pages/admin/") || f.startsWith("lib/mcp/")) continue;
      out.push({ f, t: readFileSync(p, "utf8") });
    }
  }
  return out;
}

describe("skan src: liczniki atrakcji przez formatCountPl/activityCount", () => {
  const src = pliki(SRC);

  it("brak surowej liczby przed slowem z activityWord/pluralize ani przed „atrakcji”", () => {
    const zle: string[] = [];
    const re =
      /\{\s*[\w.]+\s*\}\s*\{\s*(?:activityWord|pluralize|pluralizeActivities)\(|\$\{\s*[\w.]+\s*\}\s*\$\{\s*(?:activityWord|pluralize|pluralizeActivities)\(|\{\s*[\w.]+\s*\}\s*<\/span>\s*atrakcj/g;
    for (const { f, t } of src) for (const m of t.matchAll(re)) zle.push(`${f}: ${m[0]}`);
    expect(zle).toEqual([]);
  });

  it("„Pokaż więcej/wyniki (N)” i „Lista · N” formatuja liczbe", () => {
    const zle: string[] = [];
    const re = /(?:Pokaż (?:więcej|wyniki) \(|Lista · )(?:\$\{|\{)(?!\s*formatCountPl\()[^}]*\}/g;
    for (const { f, t } of src) for (const m of t.matchAll(re)) zle.push(`${f}: ${m[0]}`);
    expect(zle).toEqual([]);
  });
});
