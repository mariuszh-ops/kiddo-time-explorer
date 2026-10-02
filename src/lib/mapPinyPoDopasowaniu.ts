// FMN-B65: piny i lista kadru zmieniają się RAZ na zmianę filtra, po
// dopasowaniu kadru, a nie dwa razy.
//
// Zmiana filtra na mapie (wiek, chip kategorii, województwo, fraza) daje nową
// tablicę pinów od razu, a kadr jedzie do nich dopiero po 150 ms + animacji
// (MapFitBounds). Przeliczenie kadru (ViewportFilter) liczone w tym czasie
// widziało nowe piny w STARYM kadrze i podmieniało nimi markery: na jedno
// kliknięcie piny wymieniały się w całości dwa razy (nowy zbiór w starym
// kadrze, potem w nowym), a licznik migał „6 → 4 → 3378 atrakcji w widoku"
// (FMN-6-018/020/021/048, FMN-1 029/036/042/052/062/063/069, 3/3).
//
// Bramka: przeliczenie zrobione albo kończone w trakcie dopasowania odkładamy
// (stare piny zostają, licznik mówi „Wczytuję"). Pokazuje je dopiero
// przeliczenie po moveend dopasowania. Bezpiecznik oddaje odłożone piny,
// gdyby dopasowanie nigdy się nie skończyło — mapa nie zostaje z martwymi pinami.

export interface BramkaPinow<T> {
  /**
   * Wynik przeliczenia kadru. Zwraca zbiór do pokazania albo `null`
   * (dopasowanie w drodze: zostają dotychczasowe piny, zbiór czeka).
   */
  przeliczenie(widoczne: T[], wDrodzePrzyLiczeniu: boolean, wDrodzeTeraz: boolean): T[] | null;
  /** Bezpiecznik dopasowania: odłożony zbiór (raz) albo `null`, gdy nic nie czeka. */
  bezpiecznik(): T[] | null;
}

export function utworzBramkePinow<T>(): BramkaPinow<T> {
  let odlozone: T[] | null = null;
  return {
    przeliczenie(widoczne, wDrodzePrzyLiczeniu, wDrodzeTeraz) {
      if (wDrodzePrzyLiczeniu || wDrodzeTeraz) {
        odlozone = widoczne;
        return null;
      }
      odlozone = null;
      return widoczne;
    },
    bezpiecznik() {
      const z = odlozone;
      odlozone = null;
      return z;
    },
  };
}
