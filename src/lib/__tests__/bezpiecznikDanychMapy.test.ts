import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { utworzBezpiecznikDanychMapy, utworzBezpiecznikDopasowania } from "@/lib/bezpiecznikDanychMapy";

// SMOKE-01 (03.10, oś czasu z buildu sondy): dane mapy doszły w t=0, pierwsze
// przeliczenie kadru ok. 730 ms, klik chipa „Zoo” ok. 1500 ms, dopasowanie kadru
// do nowych pinów do ok. 2300 ms. Stary bezpiecznik odpalał w t=2000, w środku
// dopasowania, i zdejmował „Wczytuję” przy starych pinach („12 → Wczytuję → 12 → 51”).
describe("wiersz 29: bezpiecznik „Wczytuję” po dojściu danych mapy", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("kadr się nie przeliczył: po 2 s zdejmuje „Wczytuję” (raz)", () => {
    const zdejmij = vi.fn();
    const b = utworzBezpiecznikDanychMapy(zdejmij);
    b.uzbroj();
    vi.advanceTimersByTime(1999);
    expect(zdejmij).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(zdejmij).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5000);
    expect(zdejmij).toHaveBeenCalledTimes(1);
  });

  it("klik chipa po przeliczeniu: bezpiecznik nie odpala w trakcie dopasowania", () => {
    const zdejmij = vi.fn();
    const b = utworzBezpiecznikDanychMapy(zdejmij);
    b.uzbroj(); // dane doszły
    vi.advanceTimersByTime(730);
    b.rozbroj(); // pierwsze przeliczenie na pełnym zbiorze
    vi.advanceTimersByTime(770);
    b.rozbroj(); // klik chipa: start dopasowania (ma własny bezpiecznik)
    vi.advanceTimersByTime(800); // t = 2300, koniec dopasowania
    expect(zdejmij).not.toHaveBeenCalled();
  });

  it("start dopasowania przed przeliczeniem też rozbraja", () => {
    const zdejmij = vi.fn();
    const b = utworzBezpiecznikDanychMapy(zdejmij);
    b.uzbroj();
    vi.advanceTimersByTime(1500);
    b.rozbroj();
    vi.advanceTimersByTime(5000);
    expect(zdejmij).not.toHaveBeenCalled();
  });

  it("dane doszły drugi raz: liczy 2 s od nowa", () => {
    const zdejmij = vi.fn();
    const b = utworzBezpiecznikDanychMapy(zdejmij);
    b.uzbroj();
    vi.advanceTimersByTime(1500);
    b.uzbroj();
    vi.advanceTimersByTime(1500);
    expect(zdejmij).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(zdejmij).toHaveBeenCalledTimes(1);
  });
});

// FMN-1-058 przy CPU 4x (03.10, oś przybliżona z sondy tekstów, start dopasowania niezmierzony; t = start dopasowania po
// kliku chipa): przeliczenie kadru na nowych pinach ok. 500 ms, „Wyczyść filtry”
// ok. 1600 ms (piny trybu kadrowego w drodze), piny doszły ok. 2000-2300 ms.
// Stary bezpiecznik odpalał w t=2000 i zdejmował „Wczytuję” przy pustej liście
// kadru: „1406 → Wczytuję → 0 atrakcji w widoku → 4892” + „Brak atrakcji”.
describe("wiersz 41: bezpiecznik dopasowania kadru", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("dopasowanie bez przeliczenia: po 2 s zdejmuje „Wczytuję” (raz)", () => {
    const zdejmij = vi.fn();
    const b = utworzBezpiecznikDopasowania(zdejmij, () => false);
    b.uzbroj();
    vi.advanceTimersByTime(1999);
    expect(zdejmij).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(zdejmij).toHaveBeenCalledTimes(1);
  });

  it("przeliczenie po dopasowaniu rozbraja: „Wyczyść filtry” 1,6 s później nie dostaje „0 atrakcji”", () => {
    const zdejmij = vi.fn();
    let wDrodze = false;
    const b = utworzBezpiecznikDopasowania(zdejmij, () => wDrodze);
    b.uzbroj(); // start dopasowania
    vi.advanceTimersByTime(500);
    b.rozbroj(); // przeliczenie kadru po moveend dopasowania
    vi.advanceTimersByTime(1100);
    wDrodze = true; // „Wyczyść filtry”: piny trybu kadrowego w drodze
    vi.advanceTimersByTime(600);
    wDrodze = false; // piny doszły, lista kadru jeszcze się liczy
    vi.advanceTimersByTime(3000);
    expect(zdejmij).not.toHaveBeenCalled();
  });

  it("odpalony w trakcie pobierania danych nic nie robi", () => {
    const zdejmij = vi.fn();
    let wDrodze = false;
    const b = utworzBezpiecznikDopasowania(zdejmij, () => wDrodze);
    b.uzbroj();
    vi.advanceTimersByTime(1600);
    wDrodze = true;
    vi.advanceTimersByTime(400); // t = 2000
    wDrodze = false;
    vi.advanceTimersByTime(5000);
    expect(zdejmij).not.toHaveBeenCalled();
  });
});
