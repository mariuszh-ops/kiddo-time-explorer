/**
 * FMN-B84: chip „Ulubione" na mapie (`?fav=1`).
 *
 * Link z `fav=1` (także stary `cats=…,_favorites`) otwarty przez gościa bez
 * zapisanych ulubionych dawał aktywny chip, „0 atrakcji w widoku" i radę
 * „oddal mapę lub przesuń", która nic nie da — lista obok mówiła 302
 * (FMN-8-025, 4/4). Taki link dostaje np. drugi rodzic od zalogowanego.
 *
 * Decyzja CC 10.10 (DECYZJE.md, „FMN-B84 fav=1"): `fav=1` i stary `_favorites` działają
 * tylko razem z kadrem (lat/lng/zoom). Bez kadru filtr znika dla każdego — aplikacja
 * sama nigdy takiego linku nie tworzy, a stara mapa też go ignorowała.
 */

export interface StanUlubionych {
  /** AuthContext.isReady — przed odczytem sesji nie wiadomo, kto patrzy. */
  authGotowy: boolean;
  zalogowany: boolean;
  /** Liczba zapisanych id ulubionych (bez katalogu; gość = localStorage). */
  liczbaUlubionych: number;
}

/**
 * Czy `fav=1` z adresu zignorować przy wejściu: gość bez żadnego ulubionego.
 * Gość z ulubionymi zapisanymi lokalnie (serce w dymku mapy) zachowuje filtr,
 * żeby F5 po kliku chipa odtwarzało ten sam widok.
 */
export function ignorujUlubioneZAdresu(s: StanUlubionych): boolean {
  return s.authGotowy && !s.zalogowany && s.liczbaUlubionych === 0;
}

/**
 * Czy pusty stan mapy to „brak ulubionych", a nie pusty kadr. Rada „oddal mapę"
 * nic tu nie da: nie ma ani jednego ulubionego, więc żaden kadr nie pokaże pinów.
 */
export function pustaMapaBezUlubionych(tylkoUlubione: boolean, liczbaUlubionych: number): boolean {
  return tylkoUlubione && liczbaUlubionych === 0;
}

export interface UlubioneZalogowanego {
  /** Chip „Ulubione" aktywny. */
  tylkoUlubione: boolean;
  zalogowany: boolean;
  /** SavedActivitiesContext.ulubioneWczytane: pierwszy odczyt zapisanych z serwera skończony. */
  ulubioneWczytane: boolean;
}

/**
 * Czy ulubione zalogowanego są dla mapy jeszcze „danymi w drodze" („Wczytuję").
 *
 * Zalogowany dostaje ulubione z serwera dopiero po katalogu (mapa id↔slug) i odczycie
 * zapisanych; do tego czasu liczba to lokalne lustro, na nowym urządzeniu 0. Link z `fav=1`
 * pokazywał wtedy „0 atrakcji w widoku" i „Nie masz jeszcze ulubionych atrakcji" z przyciskiem,
 * który zdejmuje filtr (prod 10.10: 3/3, ok. 0,4–0,7 s przy szybkiej sieci, dłużej na wolnej).
 * Odczyt zakończony błędem też kończy czekanie, żeby nie zostało wieczne „Wczytuję".
 * Gość ma ulubione w localStorage od pierwszego renderu — nie czeka.
 */
export function ulubioneZalogowanegoWDrodze(s: UlubioneZalogowanego): boolean {
  return s.tylkoUlubione && s.zalogowany && !s.ulubioneWczytane;
}

export const KOMUNIKAT_BRAK_ULUBIONYCH =
  "Nie masz jeszcze ulubionych atrakcji — dodaj je sercem przy atrakcji";
export const PRZYCISK_WYLACZ_ULUBIONE = "Pokaż wszystkie atrakcje";
