// FMN-B65 (reszta, „wstecz"): „wstecz" do wpisu z zapisanym kadrem (lat/lng/zoom)
// ustawia kadr od razu (przywrocKadr, setView z reset), a piny kadru liczyły się
// dopiero 100 ms później (ViewportFilter + handleVisibleChange). W tej przerwie
// markercluster rysował STARY zbiór w NOWYM kadrze: na jedno „wstecz" piny
// wymieniały się w całości dwa razy (FMN-6-018, 3/3 I11 przed i po fd05367):
// 23 piny Polski -> 1 stary pin w Kielcach -> 2 nowe piny.
//
// Teraz piny przywróconego kadru liczymy zaraz po setView (efekt MapFitBounds,
// flushSync w MapView), więc markery i kadr zmieniają się w jednym zadaniu
// przeglądarki: jedna wymiana.

export interface PunktMapy {
  latitude: number;
  longitude: number;
}

export interface Ramka {
  contains(p: [number, number]): boolean;
}

/**
 * Piny do pokazania od razu po przywróceniu kadru albo `null`, gdy skrót nie
 * dotyczy (tryb kadrowy F-17: piny przyjdą z zapytania o nowy kadr; dane jeszcze
 * w drodze: pokaże je zwykłe przeliczenie po ich dojściu).
 */
export function pinyPrzywroconegoKadru<T extends PunktMapy>(
  piny: T[],
  ramka: Ramka,
  { trybKadru, daneWDrodze }: { trybKadru: boolean; daneWDrodze: boolean },
): T[] | null {
  if (trybKadru || daneWDrodze) return null;
  return piny.filter((a) => ramka.contains([a.latitude, a.longitude]));
}
