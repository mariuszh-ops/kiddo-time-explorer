import { describe, expect, it } from "vitest";
import {
  ARKUSZ_PEEK_PX,
  ODSTEP_LOKALIZACJI_NAD_ARKUSZEM_PX,
  dolPrzyciskuLokalizacji,
  kontrolkiMapyWidoczne,
} from "@/lib/arkuszMapy";

describe("AN-12-085: „Moja lokalizacja” nad arkuszem mapy mobilnej", () => {
  it("przy peek dolna krawędź przycisku jest nad górną krawędzią arkusza", () => {
    const dol = dolPrzyciskuLokalizacji("peek");
    expect(dol).toMatch(/^\d+px$/);
    const px = parseInt(dol, 10);
    // 96 px (stara wartość) kładło przycisk 44x44 na pasek arkusza 140 px — na „Ocena ↓”.
    expect(px).toBeGreaterThanOrEqual(ARKUSZ_PEEK_PX + 8);
    expect(px).toBe(ARKUSZ_PEEK_PX + ODSTEP_LOKALIZACJI_NAD_ARKUSZEM_PX);
  });

  it("half i full bez zmian (nad arkuszem 50% / 90%)", () => {
    expect(dolPrzyciskuLokalizacji("half")).toBe("54%");
    expect(dolPrzyciskuLokalizacji("full")).toBe("92%");
  });
});

describe("AN-PO-NOCY F3: kontrolki mapy przy pełnym arkuszu (WCAG 2.5.8)", () => {
  it("full chowa zoom i „Moja lokalizacja” (przy 92% przycisk leżał na „Przybliż mapę”)", () => {
    expect(kontrolkiMapyWidoczne("full")).toBe(false);
  });

  it("peek i half zostawiają kontrolki widoczne", () => {
    expect(kontrolkiMapyWidoczne("peek")).toBe(true);
    expect(kontrolkiMapyWidoczne("half")).toBe(true);
  });
});
