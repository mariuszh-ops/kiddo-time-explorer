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

  it("shell, preload i HeroSection zadaja DOKLADNIE tego samego pliku", () => {
    // Rozjazd zestawow = drugie pobranie hero i nowy kandydat LCP, ktory czeka
    // na start JS. Dokladnie tak bylo, gdy shell mial samo 640w, a React pelny
    // srcset: przy DPR >= 1,5 przegladarka wybierala w Reakcie 1280w i LCP
    // dostawal load delay 5,2 s (Lighthouse simulate, N-03).
    const srcset =
      "/images/hero-parent-child-640.webp 640w, /images/hero-parent-child-1280.webp 1280w, /images/hero-parent-child-1920.webp 1920w";
    const domyslny = "/images/hero-parent-child-1280.webp";
    // HeroSection (React)
    expect(hero).toContain(`src="${domyslny}"`);
    expect(hero).toContain(`srcSet="${srcset}"`);
    expect(hero).toContain('sizes="100vw"');
    // shell w index.html (adresy w data-*, zeby nie pobierac hero na podstronach)
    expect(html).toContain(`data-src="${domyslny}"`);
    expect(html).toContain(`data-srcset="${srcset}"`);
    expect(html).toContain('sizes="100vw"');
    // preload w <head> — bez imagesrcset przegladarka pobralaby href, a <img>
    // wybralby z srcset inny plik.
    expect(html).toContain(`heroPreload.href = "${domyslny}"`);
    expect(html).toContain(`heroPreload.setAttribute("imagesrcset", "${srcset}")`);
    expect(html).toContain('heroPreload.setAttribute("imagesizes", "100vw")');
  });

  it("nie przywraca blokady renderu na arkuszu aplikacji", () => {
    // Arkusz /assets/index-*.css nie jest potrzebny do namalowania shellu, wiec
    // wtyczka `cssPrzedModulami` wpuszcza go przez media="print" + onload.
    // Powrot do zwyklego <link rel=stylesheet> to +320-400 ms FCP, a LCP idzie
    // krok w krok za FCP.
    const vite = readFileSync(resolve(__dirname, "../../../vite.config.ts"), "utf8");
    expect(vite).toContain('media="print"');
    expect(vite).toContain("this.media='all'");
  });

  it("zdejmuje shell poza strona glowna i nie pobiera tam hero", () => {
    // Adres obrazka czeka w data-src, wiec skaner preloadu nie rusza go na
    // podstronach; skrypt ustawia go dopiero dla "/".
    expect(html).toMatch(/if \(location\.pathname !== "\/"\) \{ shell\.parentNode\.removeChild\(shell\); return; \}/);
    expect(html).toContain('if (location.pathname === "/")');
  });
});
