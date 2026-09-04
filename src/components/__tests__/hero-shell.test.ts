import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Kontrakt: shell #app-shell w index.html jest statyczna kopia hero i musi
 * zgadzac sie z HeroSection.tsx co do WYSOKOSCI i tresci.
 *
 * Po co: hero z shellu maluje sie ~2 s przed startem Reacta i to on jest
 * elementem LCP. Jesli hero Reacta bedzie WYZSZY niz ten z shellu, przegladarka
 * zglosi nowego, wiekszego kandydata LCP dopiero w chwili startu JS — i LCP
 * wraca z ~2,1 s do ~4,8 s (N-03). Rozjazd tekstu jest za to widoczny golym okiem
 * jako podmiana napisu w trakcie ladowania.
 */
const html = readFileSync(resolve(__dirname, "../../../index.html"), "utf8");
const hero = readFileSync(resolve(__dirname, "../HeroSection.tsx"), "utf8");

describe("shell hero w index.html vs HeroSection", () => {
  it("ma ten sam naglowek co wariant wielomiastowy hero", () => {
    const naglowek = "Sprawdzone pomysły na wspólny czas z dzieckiem";
    expect(hero).toContain(`"${naglowek}"`);
    expect(html).toContain(`<h1 class="as-h1">${naglowek}</h1>`);
  });

  it("ma ten sam podtytul", () => {
    const podtytul = "Opinie rodziców takich jak Ty";
    expect(hero).toContain(podtytul);
    expect(html).toContain(podtytul);
  });

  it("rezerwuje w shellu ta sama wysokosc hero co Tailwind w HeroSection", () => {
    // Telefon: h-[290px] w Reakcie === height: 290px w shellu.
    expect(hero).toContain("h-[290px]");
    expect(html).toContain("height: 290px;");
    // Desktop: md:h-[50vh] === height: 50vh w media query >= 768px.
    expect(hero).toContain("md:h-[50vh]");
    expect(html).toContain("height: 50vh;");
  });

  it("nie pozwala wrocic do wysokosci sterowanej trescia", () => {
    // min-h- na boxie hero oznaczaloby, ze tresc (dane, webfont) moze go
    // rozepchnac ponad shell — i LCP znow czeka na Reacta.
    expect(hero).not.toMatch(/min-h-\[280px\]/);
    expect(hero).not.toMatch(/md:min-h-\[50vh\]/);
  });

  it("maluje w shellu lekki wariant 640w, a ostry zostawia HeroSection", () => {
    // Shell ma jeden, maly plik (19,5 kB) — to on jest elementem LCP.
    expect(html).toContain('data-src="/images/hero-parent-child-640.webp"');
    expect(html).toContain('heroPreload.href = "/images/hero-parent-child-640.webp"');
    expect(html).not.toContain("hero-parent-child-1280.webp");
    // React dociaga pelny zestaw dopiero po zamontowaniu.
    for (const plik of [
      "/images/hero-parent-child-640.webp 640w",
      "/images/hero-parent-child-1280.webp 1280w",
      "/images/hero-parent-child-1920.webp 1920w",
    ]) {
      expect(hero).toContain(plik);
    }
  });

  it("zdejmuje shell poza strona glowna i nie pobiera tam hero", () => {
    // Adres obrazka czeka w data-src, wiec skaner preloadu nie rusza go na
    // podstronach; skrypt ustawia go dopiero dla "/".
    expect(html).toMatch(/if \(location\.pathname !== "\/"\) \{ shell\.parentNode\.removeChild\(shell\); return; \}/);
    expect(html).toContain('if (location.pathname === "/")');
  });
});
