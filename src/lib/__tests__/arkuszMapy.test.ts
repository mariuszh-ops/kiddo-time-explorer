import { describe, expect, it } from "vitest";
import {
  ARKUSZ_PEEK_PX,
  ODSTEP_LOKALIZACJI_NAD_ARKUSZEM_PX,
  dolPrzyciskuLokalizacji,
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
