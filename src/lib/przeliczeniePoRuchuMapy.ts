// Wiersz 35 (FMN-7-040): przeliczenie listy kadru po moveend tylko wtedy, gdy
// mapa od tego moveend stoi.
//
// Tapnięcie pinu na telefonie otwiera dymek, który przesuwa mapę DWA razy
// (Leaflet: autopan dymka, potem drugi panBy po zmianie rozmiaru dymka). Drugi
// panBy przerywa pierwszy, a przerwana animacja odpala swój moveend. Timer
// przeliczenia z tego moveend (200 ms) wypadał w trakcie drugiej animacji i liczył
// kadr pośredni: licznik „267 → 266 → 267” bez żadnego zapytania do bazy
// (zmierzone: 0 × get_map_pins w oknie tapnięcia, rozmiar mapy stały,
// `s35_sonda_rozmiar.py`). Przeliczenie, które zastaje mapę w innym miejscu niż
// jego moveend, jest nieaktualne — kolejny moveend (koniec ruchu) zaplanuje
// własne, na kadrze końcowym.

/** Minimum mapy Leaflet potrzebne do porównania kadru (L.Map to spełnia). */
export interface MapaZKadrem {
  getCenter(): { lat: number; lng: number };
  getZoom(): number;
}

/** Klucz kadru: środek + zoom. Ten sam kadr = ten sam klucz (Leaflet liczy go z pozycji panelu). */
export function kluczKadruMapy(mapa: MapaZKadrem): string {
  const c = mapa.getCenter();
  return `${mapa.getZoom()}|${c.lat}|${c.lng}`;
}

/**
 * Plan przeliczenia po moveend/zoomend: kasuje poprzedni timer i ustawia nowy,
 * który wykona `akcja` tylko wtedy, gdy kadr się nie zmienił od chwili planowania.
 * Zmieniony kadr = mapa jeszcze jedzie; jej moveend zaplanuje przeliczenie od nowa.
 */
export function zaplanujPoRuchuMapy(
  mapa: MapaZKadrem,
  timer: { current: ReturnType<typeof setTimeout> | undefined },
  ms: number,
  akcja: () => void,
): void {
  clearTimeout(timer.current);
  const kadrPrzyPlanowaniu = kluczKadruMapy(mapa);
  timer.current = setTimeout(() => {
    if (kluczKadruMapy(mapa) !== kadrPrzyPlanowaniu) return;
    akcja();
  }, ms);
}
