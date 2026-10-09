import { describe, it, expect } from "vitest";
import { anonymizeAuthor } from "@/lib/anonymizeAuthor";

/**
 * Domknięcie 09.10 (DK-4-044, P3): 19 autorów opinii Google zapisanych jednym
 * wyrazem omijało anonimizację (nazwisko w całości na karcie atrakcji).
 */
describe("anonymizeAuthor", () => {
  it.each([
    // jeden wyraz sklejony — DK-4-044
    ["JanKowalski", "Jan K."],
    ["jan.kowalski", "jan K."],
    ["jan_kowalski", "jan K."],
    ["Kasia-Nowak", "Kasia N."],
    ["Piotr_Wisniewski", "Piotr W."],
    ["ŁukaszŻółkiewski", "Łukasz Ż."],
    ["ИванПетров", "Иван П."],
    ["anna..nowak", "anna N."],
    ["JanKowalski1", "Jan K."],
    ["jan_kowalski_88", "jan K."],
    // wiele wyrazów — jak dotąd
    ["Jan Kowalski", "Jan K."],
    ["Anna Kowalska-Nowak", "Anna K."],
    ["  Anna   Maria  Nowak ", "Anna N."],
    ["anna kowalska", "anna K."],
    ["Jan K.", "Jan K."],
  ])("%s → %s", (wej, wyj) => {
    expect(anonymizeAuthor(wej)).toBe(wyj);
  });

  it.each([
    ["Anna", "Anna"],
    ["QBA", "QBA"],
    ["...", "..."],
    ["", ""],
    ["   ", ""],
    ["Jan_123", "Jan_123"],
  ])("bez nazwiska zostaje bez zmian: „%s”", (wej, wyj) => {
    expect(anonymizeAuthor(wej)).toBe(wyj);
  });

  it("żaden sklejony autor nie zostawia drugiego członu w całości", () => {
    for (const a of ["JanKowalski", "jan.kowalski", "jan_kowalski", "MartaOlszewska", "tom.wisniewski"]) {
      const wynik = anonymizeAuthor(a);
      expect(wynik).toMatch(/^\S+ \S\.$/u);
    }
  });
});
