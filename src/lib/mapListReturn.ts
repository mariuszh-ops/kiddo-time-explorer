import type { Activity } from "@/data/activities";

/**
 * noc 06.10 wiersz 2 (K2, FMN-7-026): lista „z kadru mapy” na `/` należy do
 * WPISU HISTORII, który powstał z przycisku „Lista” na mapie.
 *
 * Wcześniej żyła tylko w useState Indexu. Index odmontowuje się przy wejściu
 * na kartę atrakcji, więc „wstecz” montował go od nowa bez tej listy: ten sam
 * adres `/` pokazywał najpierw 20 kafli z kadru, a po powrocie z karty 10 kafli
 * strony głównej, bez klikniętego kafla (I13, I4; zmierzone 05.10).
 *
 * Lista jedzie w `state` samego wpisu (push przełączenia widoku), a nie w
 * adresie: adres zostaje czysty do udostępniania (link = strona główna, jak
 * dotąd), a „wstecz”, „naprzód” i F5 odtwarzają dokładnie te kafle. Żadnego
 * dodatkowego replaceState (I2 liczy każdy zapis).
 */

const POLE = "ffListaZKadru";

/**
 * Bezpiecznik rozmiaru: duży stan wpisu potrafi odrzucić przeglądarka
 * (pushState rzuca, a react-router robi wtedy pełne przeładowanie). Kadr całej
 * Polski to kilka tysięcy atrakcji — taka lista nie jedzie w historii i zostaje
 * zachowanie sprzed poprawki (lista tylko w pamięci).
 */
export const LIMIT_ZNAKOW_LISTY = 1_000_000;

/** Stan wpisu dla push „Lista” albo `undefined`, gdy lista jest za duża. */
export function stanListyZKadru(lista: Activity[]): Record<string, unknown> | undefined {
  try {
    if (JSON.stringify(lista).length > LIMIT_ZNAKOW_LISTY) return undefined;
  } catch {
    return undefined;
  }
  return { [POLE]: lista };
}

/** Lista z kadru zapisana we wpisie (`location.state`) albo `null`, gdy wpis jej nie ma. */
export function listaZKadru(state: unknown): Activity[] | null {
  if (!state || typeof state !== "object") return null;
  const lista = (state as Record<string, unknown>)[POLE];
  if (!Array.isArray(lista)) return null;
  return lista.filter(
    (a): a is Activity => Boolean(a) && typeof a === "object" && typeof (a as Activity).id === "number",
  );
}
