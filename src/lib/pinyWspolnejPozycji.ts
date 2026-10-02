/**
 * FMN-B63: atrakcje o identycznych wspolrzednych (13 miejsc w katalogu, np. Wroclaw:
 * Strefa Rozrywki, Kolejkowo, Wystawa LEGO). Od zoomu 12 klastry sa wylaczone
 * (`disableClusteringAtZoom`), wiec `spiderfyOnMaxZoom` nigdy ich nie rozsuwa: piny
 * leza na jednym pikselu i mysz albo palec siegaja tylko wierzchniego.
 *
 * Rozsuwamy je na EKRANIE, nie w danych: kazdy pin z grupy dostaje stale przesuniecie
 * ikony w pikselach (rzad obok siebie, kolejnosc po id). Przesuniecie w metrach nie
 * wystarczy: pin ma 40 px, a przy zoomie 16 to ok. 60 m. Pozycja markera (lat/lng),
 * klastry i liczniki kadru zostaja bez zmian.
 */

/** Odstep srodkow sasiednich pinow w grupie: pin ma 40 px (podswietlony 46), wiec rzad sie nie naklada. */
export const ODSTEP_PINOW_PX = 44;

export interface PunktPinu {
  id: number;
  latitude: number;
  longitude: number;
}

/** Przesuniecie ikony [dx, dy] w pikselach dla pinow, ktore dziela pozycje z innym pinem. Reszta = brak wpisu. */
export function przesunieciaPinow(piny: Iterable<PunktPinu>): Map<number, [number, number]> {
  const grupy = new Map<string, number[]>();
  for (const p of piny) {
    const klucz = `${p.latitude}|${p.longitude}`;
    const grupa = grupy.get(klucz);
    if (grupa) grupa.push(p.id);
    else grupy.set(klucz, [p.id]);
  }
  const wynik = new Map<number, [number, number]>();
  for (const ids of grupy.values()) {
    if (ids.length < 2) continue;
    ids.sort((a, b) => a - b);
    const srodek = (ids.length - 1) / 2;
    ids.forEach((id, k) => wynik.set(id, [Math.round((k - srodek) * ODSTEP_PINOW_PX), 0]));
  }
  return wynik;
}
