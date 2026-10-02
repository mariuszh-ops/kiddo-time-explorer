/**
 * FMN-B53: dokąd prowadzi „Mapa” w dolnej nawigacji (telefon).
 *
 * - Na stronie głównej („/”) robi to samo co „Mapa” w pasku filtrów
 *   (useMapUrlState.setViewMode): bieżące parametry + view=map, jeden wpis
 *   historii. Wcześniej był stały adres /?view=map, który gubił wiek,
 *   kategorię, frazę i resztę filtrów.
 * - Na „/” z już otwartą mapą zwraca null: drugi tap nie dokłada wpisu
 *   historii (FMN-7-025) ani nie resetuje kadru.
 * - Poza „/” (strona województwa = decyzja R2, karta, /my-places…) zostaje
 *   dotychczasowe /?view=map.
 */
export function bottomNavMapTarget(pathname: string, search: string): string | null {
  if (pathname !== "/") return "/?view=map";
  const params = new URLSearchParams(search);
  if (params.get("view") === "map") return null;
  params.set("view", "map");
  return `/?${params.toString()}`;
}
