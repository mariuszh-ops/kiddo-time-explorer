// FMN wiersz 29 (03.10): bezpiecznik „Wczytuję” po dojściu danych mapy.
//
// MapView trzyma „Wczytuję” od dojścia danych do pierwszego przeliczenia kadru,
// a na wypadek, gdyby kadr nie przeliczył się sam, po 2 s zdejmuje je
// bezpiecznik. Ten timer żył dalej PO udanym przeliczeniu. Klik chipa kategorii
// na mapie ok. 1,5 s po wejściu trafiał w jego koniec: bezpiecznik zdejmował
// „Wczytuję” w trakcie dopasowania kadru, kiedy bramka pinów (FMN-B65) trzymała
// jeszcze STARY zbiór, i licznik przez 0,3-0,5 s pokazywał starą liczbę
// („12 → Wczytuję → 12 → 51”, SMOKE-01 3/3, FMN-6-018 krok 2 2/3).
//
// Bezpiecznik jest potrzebny tylko do pierwszego przeliczenia: rozbraja go samo
// przeliczenie i start dopasowania kadru (dopasowanie ma własny bezpiecznik,
// który oddaje też odłożone piny).

export interface BezpiecznikDanychMapy {
  /** Dane doszły: po `ms` zdejmij „Wczytuję”, chyba że kadr przeliczy się wcześniej. */
  uzbroj(): void;
  /** Kadr przeliczył się sam, dane znów w drodze albo ruszyło dopasowanie: bezpiecznik zbędny. */
  rozbroj(): void;
}

export function utworzBezpiecznikDanychMapy(poCzasie: () => void, ms = 2000): BezpiecznikDanychMapy {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const rozbroj = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  return {
    uzbroj() {
      rozbroj();
      timer = setTimeout(() => {
        timer = undefined;
        poCzasie();
      }, ms);
    },
    rozbroj,
  };
}

// FMN wiersz 41 (03.10): bezpiecznik dopasowania kadru (MapFitBounds) żył tak
// samo jak ten wyżej: 2 s od startu dopasowania, także PO udanym przeliczeniu.
// „Wyczyść filtry” ok. 1,7 s po kliku chipa (FMN-1-058, CPU 4x, 10/10) trafiało
// w jego koniec w trakcie pobierania pinów trybu kadrowego: bezpiecznik ustawiał
// „kadr przeliczony”, a gdy piny doszły, licznik przez ok. 1 s mówił
// „0 atrakcji w widoku” i „Brak atrakcji w tym obszarze” (lista kadru jeszcze
// pusta, przeliczenie 4892 pinów trwa), zamiast „Wczytuję”.
//
// Rozbraja go przeliczenie kadru po dopasowaniu (tak jak bezpiecznik danych),
// a gdy mimo to odpali w trakcie pobierania danych, nic nie robi: dane same
// zdejmą „Wczytuję” przeliczeniem albo bezpiecznikiem danych.
export function utworzBezpiecznikDopasowania(
  poCzasie: () => void,
  daneWDrodze: () => boolean,
  ms = 2000,
): BezpiecznikDanychMapy {
  return utworzBezpiecznikDanychMapy(() => {
    if (daneWDrodze()) return;
    poCzasie();
  }, ms);
}
