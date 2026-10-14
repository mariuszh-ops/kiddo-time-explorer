import { describe, expect, it } from "vitest";
import { kadrPobrany, utworzBramkePinow } from "@/lib/mapPinyPoDopasowaniu";

// AN-3-620 (FMN-1-070 seed 31001): /?view=map okolice Siedlec, „Oddal mapę" 8 -> 7.
// Kadr zoom 8 i jego kadr zapytania (zapas 30%), potem kadr zoom 7 (2x większy).
const KADR_Z8 = { minLat: 51.42, maxLat: 52.6, minLng: 19.6, maxLng: 23.07 };
const POBRANY_Z8 = { minLat: 51.07, maxLat: 52.95, minLng: 18.56, maxLng: 24.11 };
const KADR_Z7 = { minLat: 50.81, maxLat: 53.19, minLng: 17.86, maxLng: 24.81 };
const POBRANY_Z7 = { minLat: 50.1, maxLat: 53.9, minLng: 15.77, maxLng: 26.9 };

describe("AN-3-620: kadr po oddaleniu czeka na swoje piny", () => {
  it("kadr zoom 8 mieści się w swoim kadrze zapytania", () => {
    expect(kadrPobrany(KADR_Z8, [POBRANY_Z8])).toBe(true);
  });

  it("po oddaleniu do zoom 7 piny są tylko ze starego kadru — niepełne", () => {
    expect(kadrPobrany(KADR_Z7, [POBRANY_Z8])).toBe(false);
  });

  it("po dojściu pinów kadru zoom 7 — kompletne; powrót do zoom 8 bez czekania", () => {
    expect(kadrPobrany(KADR_Z7, [POBRANY_Z8, POBRANY_Z7])).toBe(true);
    expect(kadrPobrany(KADR_Z8, [POBRANY_Z7])).toBe(true);
  });

  it("nic nie pobrano — niepełne", () => {
    expect(kadrPobrany(KADR_Z8, [])).toBe(false);
  });

  it("kadr poza granicami świata (zoom 3) przycinamy tak jak kadr zapytania", () => {
    const swiat = { minLat: -90, maxLat: 90, minLng: -180, maxLng: 180 };
    expect(kadrPobrany({ minLat: -95, maxLat: 95, minLng: -210, maxLng: 200 }, [swiat])).toBe(true);
  });

  it("bramka: licznik nie dostaje liczby pośredniej 947 -> 1 762 -> 3 302, tylko 947 -> 3 302", () => {
    const b = utworzBramkePinow<string>();
    const stare = ["a"]; // 947 w kadrze zoom 8
    const posrednie = ["a", "b"]; // 1 762: piny starego zapytania w kadrze zoom 7
    const pelne = ["a", "b", "c"]; // 3 302 po dojściu pinów zoom 7
    expect(b.przeliczenie(stare, !kadrPobrany(KADR_Z8, [POBRANY_Z8]), false)).toEqual(stare);
    expect(b.przeliczenie(posrednie, !kadrPobrany(KADR_Z7, [POBRANY_Z8]), false)).toBeNull();
    expect(b.przeliczenie(pelne, !kadrPobrany(KADR_Z7, [POBRANY_Z8, POBRANY_Z7]), false)).toEqual(pelne);
    expect(b.bezpiecznik()).toBeNull();
  });
});
