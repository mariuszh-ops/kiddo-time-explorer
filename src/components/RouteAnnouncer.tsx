import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

/** Ile czekamy, aż tytuł przestanie się zmieniać, zanim go ogłosimy. */
export const CISZA_TYTULU_MS = 400;
/** Górny limit czekania na nowy tytuł (ta sama nazwa strony albo wolna sieć). */
export const LIMIT_OGLOSZENIA_MS = 2500;

/**
 * AF-6-014 (WCAG 4.1.3, 2.4.3): po nawigacji SPA czytnik ekranu nie dostawał
 * żadnej informacji, że otworzyła się inna strona — fokus zostawał na
 * klikniętym linku (albo spadał na <body>), a nowego <title> czytnik sam nie
 * odczytuje. Ten komponent ogłasza tytuł nowej strony w regionie aria-live.
 *
 * - Tylko zmiana ŚCIEŻKI. Same parametry (?type=, ?view=map, fraza) to ta sama
 *   strona — liczniki wyników mają własne regiony z role="status".
 * - Pierwsze wejście pomijamy: czytnik i tak czyta stronę po załadowaniu.
 * - Fokusu NIE przenosimy: trasy mają własne zarządzanie fokusem i scrollem
 *   (powrót z karty, MapView, CategoryPage, skip-link).
 * - Bez role="status": stanowisko FMN czyta [role=status] jako liczniki wyników.
 * - Tytuł ustawia Helmet asynchronicznie (requestAnimationFrame), a leniwa trasa
 *   może się jeszcze doładowywać, więc czekamy, aż document.title zmieni się
 *   względem tytułu sprzed nawigacji i ucichnie na CISZA_TYTULU_MS. Gdy się nie
 *   zmieni, po LIMIT_OGLOSZENIA_MS ogłaszamy bieżący tytuł.
 */
const nazwaStrony = () =>
  document.title.trim() || document.querySelector("h1")?.textContent?.trim() || "";

const RouteAnnouncer = () => {
  const { pathname } = useLocation();
  const poprzedniaSciezka = useRef(pathname);
  const [komunikat, setKomunikat] = useState("");

  useEffect(() => {
    if (poprzedniaSciezka.current === pathname) return;
    poprzedniaSciezka.current = pathname;

    const tytulPrzed = document.title;
    // Czyścimy region, żeby ten sam tytuł drugi raz (A -> B -> A) też był
    // zmianą treści, którą czytnik ogłosi.
    setKomunikat("");

    let cisza: number | undefined;
    let limit: number | undefined;
    const obserwator = new MutationObserver(() => {
      if (document.title === tytulPrzed) return;
      window.clearTimeout(cisza);
      cisza = window.setTimeout(oglos, CISZA_TYTULU_MS);
    });
    function oglos() {
      obserwator.disconnect();
      window.clearTimeout(cisza);
      window.clearTimeout(limit);
      setKomunikat(nazwaStrony());
    }
    obserwator.observe(document.head, { childList: true, subtree: true, characterData: true });
    limit = window.setTimeout(oglos, LIMIT_OGLOSZENIA_MS);

    return () => {
      obserwator.disconnect();
      window.clearTimeout(cisza);
      window.clearTimeout(limit);
    };
  }, [pathname]);

  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true" data-testid="route-announcer">
      {komunikat}
    </div>
  );
};

export default RouteAnnouncer;
