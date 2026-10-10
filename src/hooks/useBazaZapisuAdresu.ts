import { useCallback, useContext } from "react";
import { UNSAFE_NavigationContext, useLocation } from "react-router-dom";

/**
 * Od jakiego adresu liczyć zapis parametrów (filtry, kadr mapy, widok).
 *
 * react-router 6.30 podaje do `setSearchParams(prev => …)` `searchParams`
 * z OSTATNIEGO RENDERU (domknięcie), a nie adres z historii. Historia
 * (`history.pushState` w BrowserRouterze, MemoryHistory w testach) zmienia się
 * od razu przy navigate(), React oddaje nowy adres dopiero po commicie.
 * Zapis w tym oknie liczony od `prev` gubił poprzedni zapis:
 * - FMN-B23: dwa zapisy w jednym takcie (fraza + promień, fraza + filtry),
 * - AF-5-065: opcja „Kategorii” zapisuje filtr w startTransition, a ruch mapy
 *   przed commitem przejścia (moveend → handleSaveMapState) zdejmował kategorię.
 *
 * Zasada: gdy historia (ta sama ścieżka) ma inny adres niż ten, który widział
 * ten render, liczymy od historii — to ona jest adresem w pasku przeglądarki.
 * W przeciwnym razie od `prev`, jak dotąd. „Wstecz” w trakcie przejścia cofa
 * historię, więc cofnięty filtr nie wraca w następnym zapisie (notatka
 * „zapis w toku” w useActivityFilters by go wskrzesiła — test
 * zapisAdresuWPrzejsciu.test.tsx).
 */
export function useBazaZapisuAdresu(): (prev: URLSearchParams) => URLSearchParams {
  const { navigator } = useContext(UNSAFE_NavigationContext);
  const { pathname, search } = useLocation();
  return useCallback(
    (prev: URLSearchParams) => {
      // BrowserRouter i MemoryRouter: navigator to obiekt historii z bieżącym `location`.
      // Router danych (RouterProvider) go nie ma — wtedy zostaje `prev`.
      const historia = (navigator as { location?: { pathname: string; search: string } }).location;
      if (!historia || historia.pathname !== pathname || historia.search === search) return prev;
      return new URLSearchParams(historia.search);
    },
    [navigator, pathname, search],
  );
}
