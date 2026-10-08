import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// AF-6-034 (WCAG 1.4.11): obrys pola formularza (token --input) jest jedynym
// znakiem, gdzie zaczyna sie puste pole, wiec musi miec >= 3:1 do tla, na ktorym
// pole stoi. Przed poprawka --input = --border = 35 20% 88% -> 1,25:1.
const SRC = resolve(__dirname, "../..");
const czytaj = (p: string) => readFileSync(resolve(SRC, p), "utf8");
const css = czytaj("index.css");

type Rgb = [number, number, number];

// Ta sama matematyka co audyt (AF-6_lib.mjs): HSL -> sRGB 0..255, luminancja WCAG 2.x.
function hslDoRgb(h: number, s: number, l: number): Rgb {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((x) => Math.round(x * 255)) as Rgb;
}
function luminancja([r, g, b]: Rgb) {
  const f = (x: number) => {
    x /= 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function kontrast(a: Rgb, b: Rgb) {
  const la = luminancja(a);
  const lb = luminancja(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function tokeny(blok: ":root {" | ".dark {") {
  const start = css.indexOf(blok);
  expect(start).toBeGreaterThanOrEqual(0);
  const tekst = css.slice(start, css.indexOf("\n  }", start));
  const o: Record<string, Rgb> = {};
  for (const m of tekst.matchAll(/--([a-z-]+):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*;/g)) {
    o[m[1]] = hslDoRgb(Number(m[2]), Number(m[3]), Number(m[4]));
  }
  return o;
}

describe("kontrast obrysu pol --input >= 3:1 (AF-6-034)", () => {
  it("samokontrola miary: czarny/bialy 21:1, #777/#888 ponizej 3:1", () => {
    expect(kontrast([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 1);
    expect(kontrast([119, 119, 119], [136, 136, 136])).toBeLessThan(3);
  });

  it("jasny motyw: --input vs tlo strony, karta i popover >= 3", () => {
    const t = tokeny(":root {");
    for (const tlo of ["background", "card", "popover"]) {
      expect(t.input, "--input w :root").toBeDefined();
      expect(kontrast(t.input, t[tlo]), `--input vs --${tlo}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("ciemny motyw (.dark): --input vs tlo i karta >= 3", () => {
    const t = tokeny(".dark {");
    for (const tlo of ["background", "card"]) {
      expect(t.input, "--input w .dark").toBeDefined();
      expect(kontrast(t.input, t[tlo]), `.dark --input vs --${tlo}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("pola i Switch czytaja obrys/tor z tokenu --input", () => {
    expect(czytaj("components/ui/input.tsx")).toMatch(/\bborder border-input\b/);
    expect(czytaj("components/ui/textarea.tsx")).toMatch(/\bborder border-input\b/);
    expect(czytaj("components/ui/select.tsx")).toMatch(/\bborder border-input\b/);
    expect(czytaj("components/ui/input-otp.tsx")).toMatch(/\bborder-input\b/);
    const sw = czytaj("components/ui/switch.tsx");
    expect(sw).toMatch(/data-\[state=unchecked\]:bg-input/);
    expect(sw).toMatch(/SwitchPrimitives\.Thumb[\s\S]{0,300}?\bbg-background\b/);
  });
});
