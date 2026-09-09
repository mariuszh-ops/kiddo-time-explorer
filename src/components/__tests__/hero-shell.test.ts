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

  it("rezerwuje w shellu hero SCISLE WYZSZE niz w HeroSection", () => {
    // Chrome zglasza nowego kandydata LCP tylko dla elementu SCISLE WIEKSZEGO od
    // dotychczasowego. Gdy shell i hero Reacta mialy identyczne 290 px (do 05.09),
    // atrybucja LCP stala na remisie — wystarczylo zaokraglenie subpikselowe, zeby
    // <img> Reacta przejal LCP razem z czasem startu JS (PSI: 5,2 s zamiast FCP).
    // Zapas nie moze tez rosnac bez konca: shell jest widoczny przez ~0,5 s i za
    // duza roznica bylaby widoczna jako skok przy montowaniu.
    const wReakcie = Number(/h-\[(\d+)px\]/.exec(hero)?.[1]);
    const wShellu = Number(/#app-shell \.as-hero \{[\s\S]{0,400}?height: (\d+)px;/.exec(html)?.[1]);
    expect(wReakcie).toBe(290);
    expect(wShellu).toBeGreaterThan(wReakcie);
    expect(wShellu - wReakcie).toBeLessThanOrEqual(12);
    // Desktop: ten sam zapas nad md:h-[50vh].
    expect(hero).toContain("md:h-[50vh]");
    expect(html).toMatch(/height: calc\(50vh \+ (\d+)px\);/);
    const zapasDesktop = Number(/height: calc\(50vh \+ (\d+)px\);/.exec(html)?.[1]);
    expect(zapasDesktop).toBe(wShellu - wReakcie);
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
    // shell w index.html: obrazek jest WBUDOWANY jako data URI. Zejscie z
    // <img src> do pliku cofa naprawe z N-03: hero shellu ladowalby sie z sieci,
    // nie zdazylby przed startem Reacta i elementem LCP znow zostalby <img>
    // Reacta (PSI 5,2 s zamiast czasu FCP).
    expect(html).toMatch(/id="as-hero-img"[\s\S]{0,200}src="data:image\/webp;base64,[A-Za-z0-9+/=]{5000,}"/);
    // Wymiar naturalny musi pokryc box hero na telefonie w pelnej gestosci
    // pikseli (412 x 290 CSS przy DPR 1,75 = 721 x 508). Mniejszy obrazek to
    // mniejszy kandydat LCP i przegladarka nadpisze go obrazkiem Reacta.
    const szer = Number(/id="as-hero-img"[\s\S]{0,120}width="(\d+)"/.exec(html)?.[1]);
    expect(szer).toBeGreaterThanOrEqual(720);
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

  it("zdejmuje shell ORAZ trwaly obrazek poza strona glowna", () => {
    // Na podstronach hero nie jest elementem LCP, a zostawiony <img> wisialby
    // pod trescia jako niepotrzebny obrazek na kazdym ekranie.
    expect(html).toMatch(/if \(location\.pathname !== "\/"\) \{/);
    expect(html).toContain("if (trwaly) trwaly.parentNode.removeChild(trwaly);");
    expect(html).toContain("if (shell) shell.parentNode.removeChild(shell);");
    expect(html).toContain('if (location.pathname === "/")');
  });

  it("trzyma obrazek LCP POZA #root, zeby React go nie usunal", () => {
    // Sedno naprawy N-03: createRoot(#root) czysci kontener. Dopoki <img>
    // siedzial w #root, wygrany kandydat LCP znikal z DOM w chwili montowania
    // i Lighthouse przypisywal LCP dopiero <img> Reacta (PSI mobile 5,0 s).
    const pozKeep = html.indexOf('id="as-hero-keep"');
    const pozImg = html.indexOf('id="as-hero-img"');
    const pozRoot = html.indexOf('<div id="root">');
    expect(pozKeep).toBeGreaterThan(-1);
    expect(pozImg).toBeGreaterThan(pozKeep);
    expect(pozImg).toBeLessThan(pozRoot);
    // ...i nie wrocil do srodka .as-hero.
    expect(html).not.toMatch(/#app-shell \.as-hero > img/);
  });

  it("chowa trwaly obrazek pod trescia zamiast go kasowac", () => {
    // z-index:-1 + przezroczyste <body> = obrazek widac w fazie shellu, a po
    // zamontowaniu Reacta zakrywa go nieprzezroczyste `bg-background` aplikacji.
    // Gdyby tlo zostalo na <body>, obrazek bylby niewidoczny OD RAZU (bloki w
    // przeplywie maluja sie PO warstwach z ujemnym z-index) i LCP by go pominal.
    expect(html).toMatch(/#as-hero-keep \{[\s\S]{0,200}?z-index: -1;/);
    expect(html).toContain("html { background: #FCFAF8; }");
    expect(html).not.toMatch(/html, body \{ margin: 0; background:/);
    const css = readFileSync(resolve(__dirname, "../../index.css"), "utf8");
    const bezOdstepow = css.replace(/\s+/g, " ");
    expect(bezOdstepow).toContain("html { @apply bg-background; }");
    expect(bezOdstepow).not.toContain("body { @apply bg-background");
  });

  it("trwaly obrazek ma DOKLADNIE geometrie hero z shellu", () => {
    // Rozjazd = obrazek wystaje spod hero Reacta albo jest mniejszym kandydatem
    // LCP niz <img> Reacta (wtedy React zglasza wiekszego kandydata i LCP znow
    // czeka na start JS).
    const wysHero = /#app-shell \.as-hero \{[\s\S]{0,400}?height: (\d+)px;/.exec(html)?.[1];
    const wysKeep = /#as-hero-keep \{[\s\S]{0,300}?height: (\d+)px;/.exec(html)?.[1];
    expect(wysKeep).toBe(wysHero);
    // Gora = wysokosc naglowka shellu (73 px telefon / 89 px + 16 px padding).
    expect(html).toMatch(/#as-hero-keep \{[\s\S]{0,200}?top: 73px;/);
    expect(html).toMatch(/#as-hero-keep \{[\s\S]{0,200}?top: 105px;/);
    // Desktop: ten sam zapas 50vh + 6px co .as-hero.
    const zapasy = html.match(/height: calc\(50vh \+ (\d+)px\);/g) ?? [];
    expect(zapasy).toHaveLength(2);
    expect(zapasy[0]).toBe(zapasy[1]);
  });

  it("montuje Reacta dopiero po namalowaniu hero shellu", () => {
    // Bez tej bramki createRoot czysci #root, zanim przegladarka namaluje
    // obrazek shellu — shell znika NIENAMALOWANY i elementem LCP zostaje
    // <img> Reacta, czyli caly lancuch JS (N-03).
    const main = readFileSync(resolve(__dirname, "../../main.tsx"), "utf8");
    expect(main).toContain("img.decode()");
    expect(main).toMatch(/shellNamalowany\(\)\.then\(\(\) => \{\s*createRoot/);
    // JEDNO rAF nie wystarcza: callback leci PRZED oddaniem klatki, wiec przy
    // CPU x4 (profil PSI mobile) React startowal przed namalowaniem shellu.
    // Musza byc DWA zagniezdzone rAF-y...
    expect(main).toMatch(
      /requestAnimationFrame\(\s*\(\) =>\s*requestAnimationFrame\(/
    );
    // ...oraz twardy dowod z przegladarki, ze shell zostal kandydatem LCP.
    expect(main).toContain('obs.observe({ type: "largest-contentful-paint", buffered: true })');
    expect(main).toContain('kandydatLCP("as-hero-img")');
  });
});
