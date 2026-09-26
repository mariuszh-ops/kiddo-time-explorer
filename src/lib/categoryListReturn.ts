/**
 * FMN-B21: na stronie województwa/kategorii `?page=N` znaczy dwie rzeczy:
 * - link paginacji SEO „N" (albo wklejony adres) = TYLKO strona N (K-03),
 * - „Pokaż więcej" zapisuje w adresie osiągniętą stronę, ale na ekranie są
 *   strony od pierwszej do N.
 * Adres ich nie rozróżnia, więc po „wstecz" z karty atrakcji i po F5 lista
 * wracała jako sama strona N (zmierzone 26.09: 48 kafli → 24, inny pierwszy
 * kafel, kafla źródłowego brak).
 *
 * Rozróżnia je stan wpisu historii: „Pokaż więcej" zapisuje razem z ?page=
 * numer pierwszej strony listy (`state` tej samej nawigacji replace, więc bez
 * dodatkowego wpisu w historii). Stan przeżywa „wstecz", „naprzód" i F5, a nowy
 * wpis (klik w link, wklejony adres) rodzi się bez niego — to wzorzec FMN-B03
 * (homeListReturn.ts) z tą różnicą, że tu stan jedzie w `usr` react-routera,
 * bo i tak nawigujemy, żeby zapisać ?page=.
 */

const POLE = "ffListaOd";

function obiekt(stan: unknown): Record<string, unknown> | null {
  return stan && typeof stan === "object" && !Array.isArray(stan) ? (stan as Record<string, unknown>) : null;
}

/**
 * Pierwsza strona listy (0 = pierwsza) dla wpisu o stanie `stan` i adresie
 * `?page=ostatnia+1`. Bez zapisu albo z zapisem, który do adresu nie pasuje:
 * `ostatnia`, czyli sama strona z adresu.
 */
export function pierwszaStronaListy(stan: unknown, ostatnia: number): number {
  const od = obiekt(stan)?.[POLE];
  if (typeof od !== "number" || !Number.isInteger(od) || od < 0 || od > ostatnia) return ostatnia;
  return od;
}

/**
 * Stan wpisu do zapisania razem z `?page=ostatnia+1`. Numer pierwszej strony
 * trafia tam tylko, gdy lista zaczyna się wcześniej niż strona z adresu; reszta
 * cudzego stanu zostaje nietknięta.
 */
export function stanListy(stary: unknown, od: number, ostatnia: number): Record<string, unknown> | undefined {
  const nowy = { ...(obiekt(stary) ?? {}) };
  delete nowy[POLE];
  if (od < ostatnia) nowy[POLE] = od;
  return Object.keys(nowy).length > 0 ? nowy : undefined;
}
