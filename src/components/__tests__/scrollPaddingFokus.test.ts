import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// AF-6-064 (WCAG 2.4.11): przewijanie do fokusu musi omijac sticky naglowek
// i staly BottomNav. Bez scroll-padding na <html> Tab na 390 chowal przycisk
// "Ulubione" na karcie atrakcji calkowicie pod dolnym paskiem.
describe("scroll-padding pod naglowek i BottomNav (AF-6-064)", () => {
  const css = readFileSync(resolve(__dirname, "../../index.css"), "utf8").replace(/\s+/g, " ");

  it("html ma scroll-padding-top = --header-h i scroll-padding-bottom = --bottom-nav-h", () => {
    const reguly = [...css.matchAll(/(?:^|[\s}])html \{([^}]*)\}/g)].map((m) => m[1]);
    const wszystko = reguly.join(" ");
    expect(wszystko).toMatch(/scroll-padding-top: var\(--header-h\b/);
    expect(wszystko).toMatch(/scroll-padding-bottom: var\(--bottom-nav-h\b/);
  });

  it("desktop zeruje --bottom-nav-h (brak dolnego paska = brak dolnego odstepu)", () => {
    expect(css).toMatch(/@media \(min-width: 768px\) \{ :root \{[^}]*--bottom-nav-h: 0px;/);
  });
});
