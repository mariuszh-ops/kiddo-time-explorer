import { describe, expect, it } from "vitest";
import { jestPunktWKadrze, pinyKadruWDrodze } from "@/lib/mapKadrWDrodze";

// Kadry z FMN-1-040: mapa startuje nad Warszawą, potem filtr „opolskie",
// potem „Wyczyść filtry" — kadr zostaje nad opolskim, piny w pamięci z Warszawy.
const OPOLSKIE = { minLat: 50.2, maxLat: 51.1, minLng: 17.0, maxLng: 18.7 };
const PIN_WARSZAWA = { latitude: 52.23, longitude: 21.01 };
const PIN_OPOLE = { latitude: 50.67, longitude: 17.93 };

describe("FMN-B11 krok 2: piny trybu kadrowego w drodze", () => {
  it("stare piny spoza kadru w trakcie pobierania = wczytuję, nie „Brak atrakcji”", () => {
    expect(pinyKadruWDrodze({ piny: [PIN_WARSZAWA], kadr: OPOLSKIE, wczytuje: true, blad: false })).toBe(true);
  });

  it("po pobraniu kadr bez pinów to prawdziwe zero (komunikat zostaje)", () => {
    expect(pinyKadruWDrodze({ piny: [PIN_WARSZAWA], kadr: OPOLSKIE, wczytuje: false, blad: false })).toBe(false);
  });

  it("pin w kadrze: pobieranie dociąga resztę, licznik nie wraca do „wczytuję”", () => {
    expect(pinyKadruWDrodze({ piny: [PIN_WARSZAWA, PIN_OPOLE], kadr: OPOLSKIE, wczytuje: true, blad: false })).toBe(false);
  });

  it("awaria pinów nie jest „wczytuję” (komunikat błędu ma pierwszeństwo)", () => {
    expect(pinyKadruWDrodze({ piny: [], kadr: OPOLSKIE, wczytuje: true, blad: true })).toBe(false);
  });

  it("bez pinów i bez znanego kadru = wczytuję (jak przed poprawką)", () => {
    expect(pinyKadruWDrodze({ piny: [], kadr: null, wczytuje: false, blad: false })).toBe(true);
    expect(pinyKadruWDrodze({ piny: [], kadr: OPOLSKIE, wczytuje: true, blad: false })).toBe(true);
    expect(pinyKadruWDrodze({ piny: [], kadr: OPOLSKIE, wczytuje: false, blad: false })).toBe(false);
  });

  it("krawędź kadru się liczy", () => {
    expect(jestPunktWKadrze([{ latitude: 50.2, longitude: 18.7 }], OPOLSKIE)).toBe(true);
    expect(jestPunktWKadrze([{ latitude: 50.19, longitude: 18.7 }], OPOLSKIE)).toBe(false);
  });
});
