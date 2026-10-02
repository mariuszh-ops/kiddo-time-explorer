// FMN-B11 krok 2: kiedy mapa w trybie kadrowym (bez filtrów katalogu, F-17)
// ma jeszcze mówić „Wczytuję", a kiedy wolno jej powiedzieć „Brak atrakcji
// w tym obszarze".
//
// Piny trybu kadrowego są kumulowane: po „Wyczyść filtry" na mapie województwa
// hook ma w pamięci piny z kadru sprzed filtrów (np. okolice Warszawy), a kadr
// stoi już nad opolskim. Stary warunek („w drodze" tylko przy ZERZE pinów)
// uznawał te piny za dane, więc przez cały czas pobierania nowego kadru
// (ok. 0,6 s) mapa pokazywała „Brak atrakcji w tym obszarze" (FMN-1-040, 3/3).
// Liczy się nie to, czy jakieś piny są, tylko czy są W WIDOCZNYM KADRZE.

/** Kadr mapy w stopniach: południe/północ, zachód/wschód. */
export interface KadrStopnie {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** `true`, gdy choć jeden punkt leży w kadrze (krawędź się liczy). */
export function jestPunktWKadrze(
  punkty: ReadonlyArray<{ latitude: number; longitude: number }>,
  kadr: KadrStopnie,
): boolean {
  return punkty.some(
    (p) =>
      p.latitude >= kadr.minLat &&
      p.latitude <= kadr.maxLat &&
      p.longitude >= kadr.minLng &&
      p.longitude <= kadr.maxLng,
  );
}

/**
 * Piny trybu kadrowego „w drodze": brak awarii, w widocznym kadrze nie ma
 * jeszcze żadnego pinu, a kadr albo nie jest jeszcze znany, albo trwa jego
 * pobieranie. Kadr pusty PO pobraniu to prawdziwe zero (komunikat zostaje).
 */
export function pinyKadruWDrodze({
  piny,
  kadr,
  wczytuje,
  blad,
}: {
  piny: ReadonlyArray<{ latitude: number; longitude: number }>;
  kadr: KadrStopnie | null;
  wczytuje: boolean;
  blad: boolean;
}): boolean {
  if (blad) return false;
  const pinyWKadrze = kadr ? jestPunktWKadrze(piny, kadr) : piny.length > 0;
  if (pinyWKadrze) return false;
  return kadr == null || wczytuje;
}
