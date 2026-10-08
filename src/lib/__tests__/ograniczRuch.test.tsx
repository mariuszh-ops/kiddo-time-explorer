import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { prefersReducedMotion, scrollBehavior } from "@/lib/reducedMotion";
import HorizontalCarousel from "@/components/HorizontalCarousel";

// AF-6-036 / AF-7-028: systemowe „ogranicz ruch” (prefers-reduced-motion: reduce) obejmuje
// takze ruch z JS: framer-motion (MotionConfig reducedMotion="user"), jawne behavior "smooth",
// flyTo i animacje Leaflet (mapa, klastry) oraz przewijanie zdjec Embla.
// RUCH_SRC pozwala wskazac inny katalog src (kontrola mutacji na starym kodzie).
const SRC = process.env.RUCH_SRC ?? resolve(__dirname, "../..");

const oryginalMatchMedia = window.matchMedia;
function ustawPreferencje(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion: reduce"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  window.matchMedia = oryginalMatchMedia;
  vi.restoreAllMocks();
});

describe("prefersReducedMotion / scrollBehavior", () => {
  it("czyta systemowa preferencje w chwili wywolania", () => {
    ustawPreferencje(true);
    expect(prefersReducedMotion()).toBe(true);
    expect(scrollBehavior()).toBe("auto");
    ustawPreferencje(false);
    expect(prefersReducedMotion()).toBe(false);
    expect(scrollBehavior()).toBe("smooth");
  });

  it("bez matchMedia albo przy wyjatku zachowuje sie jak bez preferencji", () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    expect(prefersReducedMotion()).toBe(false);
    window.matchMedia = (() => {
      throw new Error("blocked");
    }) as unknown as typeof window.matchMedia;
    expect(prefersReducedMotion()).toBe(false);
    expect(scrollBehavior()).toBe("smooth");
  });
});

describe("HorizontalCarousel — strzalka przewija skokiem przy „ogranicz ruch”", () => {
  function renderujZPrzewijaniem() {
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(1200);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(300);
    const scrollBy = vi.fn();
    (HTMLElement.prototype as unknown as { scrollBy: unknown }).scrollBy = scrollBy;
    render(
      <HorizontalCarousel>
        {[<div key="a">A</div>, <div key="b">B</div>, <div key="c">C</div>]}
      </HorizontalCarousel>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Przewiń w prawo" }));
    return scrollBy;
  }

  it("reduce -> behavior auto", () => {
    ustawPreferencje(true);
    const scrollBy = renderujZPrzewijaniem();
    expect(scrollBy).toHaveBeenCalledTimes(1);
    expect(scrollBy.mock.calls[0][0]).toMatchObject({ behavior: "auto" });
  });

  it("bez preferencji -> behavior smooth (zwykly uzytkownik bez zmian)", () => {
    ustawPreferencje(false);
    const scrollBy = renderujZPrzewijaniem();
    expect(scrollBy.mock.calls[0][0]).toMatchObject({ behavior: "smooth" });
  });
});

type Plik = { f: string; t: string };
function pliki(dir: string, out: Plik[] = []): Plik[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (["__tests__", "test", "integrations"].includes(e.name)) continue;
      pliki(p, out);
    } else if (/\.tsx?$/.test(e.name) && !/\.(test|spec)\./.test(e.name) && !e.name.endsWith(".d.ts")) {
      const t = readFileSync(p, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
      out.push({ f: relative(SRC, p).split("\\").join("/"), t });
    }
  }
  return out;
}

describe("skan src: ruch z JS warunkowy (bramka AF-6-036 / AF-7-028)", () => {
  const P = pliki(SRC);
  const plik = (f: string) => P.find((x) => x.f === f)?.t ?? "";

  it("App.tsx: <MotionConfig reducedMotion=\"user\"> obejmuje aplikacje, nigdzie never/always", () => {
    expect(plik("App.tsx")).toMatch(/<MotionConfig\b[^>]*reducedMotion="user"[^>]*>/);
    const wymuszone = P.filter((x) => /reducedMotion\s*[=:]\s*\{?\s*["'](never|always)["']/.test(x.t)).map((x) => x.f);
    expect(wymuszone).toEqual([]);
  });

  it("0 jawnych behavior: \"smooth\" i 0 animate: true", () => {
    const smooth = P.filter((x) => /behavior:\s*["']smooth["']/.test(x.t)).map((x) => x.f);
    const animate = P.filter((x) => /\banimate:\s*true\b/.test(x.t)).map((x) => x.f);
    expect({ smooth, animate }).toEqual({ smooth: [], animate: [] });
  });

  it("flyTo i <MapContainer> zalezne od prefersReducedMotion()", () => {
    const bez: string[] = [];
    for (const x of P) {
      const L = x.t.split("\n");
      L.forEach((l, i) => {
        if (/\.(flyTo|flyToBounds|panTo|panBy)\s*\(/.test(l) && !/prefersReducedMotion\s*\(/.test(L.slice(Math.max(0, i - 3), i + 1).join("\n"))) bez.push(x.f + ":" + (i + 1));
      });
      for (const m of x.t.matchAll(/<MapContainer\b[\s\S]*?>/g)) if (!/zoomAnimation=\{[^}]*prefersReducedMotion\(/.test(m[0])) bez.push(x.f + " <MapContainer>");
    }
    expect(bez).toEqual([]);
  });

  it("Embla: scrollTo/scrollPrev/scrollNext z argumentem jump", () => {
    const bez: string[] = [];
    for (const x of P.filter((y) => !y.f.startsWith("components/ui/"))) {
      for (const m of x.t.matchAll(/emblaApi\??\.(scrollTo|scrollPrev|scrollNext)\s*\(([^)]*)\)/g)) {
        const args = m[2].split(",").map((s) => s.trim()).filter(Boolean);
        const jump = m[1] === "scrollTo" ? args[1] : args[0];
        if (!jump || !(jump === "true" || /prefersReducedMotion\(/.test(jump))) bez.push(x.f + " " + m[0]);
      }
    }
    expect(bez).toEqual([]);
  });
});
