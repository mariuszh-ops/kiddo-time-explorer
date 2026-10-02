import { describe, expect, it } from "vitest";
import { utworzBramkePinow } from "@/lib/mapPinyPoDopasowaniu";

// FMN-6-020: wiek 14+ na mapie — nowy zbiór w starym kadrze (4 piny), potem
// po dopasowaniu kadru 3378. Markery mają się zmienić raz, na 3378.
const STARE_KADR = ["kielce-a", "kielce-b", "kielce-c", "kielce-d"];
const NOWE_PO_DOPASOWANIU = ["krakow-a", "warszawa-b", "gdansk-c"];

describe("FMN-B65: piny po dopasowaniu kadru, nie przed nim", () => {
  it("przeliczenie w trakcie dopasowania nie podmienia pinów", () => {
    const b = utworzBramkePinow<string>();
    expect(b.przeliczenie(STARE_KADR, true, true)).toBeNull();
  });

  it("dopasowanie ruszyło po liczeniu (timer 100 ms) — też czeka", () => {
    const b = utworzBramkePinow<string>();
    expect(b.przeliczenie(STARE_KADR, false, true)).toBeNull();
    expect(b.przeliczenie(STARE_KADR, true, false)).toBeNull();
  });

  it("przeliczenie po moveend dopasowania pokazuje nowy zbiór i czyści odłożony", () => {
    const b = utworzBramkePinow<string>();
    b.przeliczenie(STARE_KADR, true, true);
    expect(b.przeliczenie(NOWE_PO_DOPASOWANIU, false, false)).toEqual(NOWE_PO_DOPASOWANIU);
    // Bezpiecznik po udanym dopasowaniu nie cofa pinów do starego kadru.
    expect(b.bezpiecznik()).toBeNull();
  });

  it("bezpiecznik oddaje odłożony zbiór raz, gdy dopasowanie się nie skończyło", () => {
    const b = utworzBramkePinow<string>();
    b.przeliczenie(STARE_KADR, true, true);
    expect(b.bezpiecznik()).toEqual(STARE_KADR);
    expect(b.bezpiecznik()).toBeNull();
  });

  it("bez dopasowania (tryb kadrowy, przesunięcie mapy) piny idą od razu", () => {
    const b = utworzBramkePinow<string>();
    expect(b.przeliczenie(STARE_KADR, false, false)).toEqual(STARE_KADR);
  });
});
