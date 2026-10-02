import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { utworzBezpiecznikDanychMapy } from "@/lib/bezpiecznikDanychMapy";

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
