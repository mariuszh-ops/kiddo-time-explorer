/**
 * FMN-B84: chip „Ulubione" na mapie (`?fav=1`).
 *
 * Link z `fav=1` (także stary `cats=…,_favorites`) otwarty przez gościa bez
 * zapisanych ulubionych dawał aktywny chip, „0 atrakcji w widoku" i radę
 * „oddal mapę lub przesuń", która nic nie da — lista obok mówiła 302
 * (FMN-8-025, 4/4). Taki link dostaje np. drugi rodzic od zalogowanego.
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

export const KOMUNIKAT_BRAK_ULUBIONYCH =
  "Nie masz jeszcze ulubionych atrakcji — dodaj je sercem przy atrakcji";
export const PRZYCISK_WYLACZ_ULUBIONE = "Pokaż wszystkie atrakcje";
