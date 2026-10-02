import { describe, expect, it } from "vitest";
import L from "leaflet";
import { pinyPrzywroconegoKadru } from "@/lib/pinyPrzywroconegoKadru";

// FMN-6-018: „wstecz" z /?type=sala-zabaw (cała Polska) do wpisu
// type=zoo,sala-zabaw z kadrem Kielc. Piny kadru mają być od razu oba punkty
// z Kielc, a nie stary zbiór w nowym kadrze.
const kielce = L.latLngBounds([50.86, 20.62], [50.9, 20.68]);
const piny = [
  { id: 1, latitude: 50.87835, longitude: 20.648 }, // sala zabaw, Kielce
  { id: 2, latitude: 50.87835, longitude: 20.648 }, // zoo, ten sam punkt
  { id: 3, latitude: 52.2297, longitude: 21.0122 }, // Warszawa, poza kadrem
];

describe("pinyPrzywroconegoKadru (FMN-B65, wstecz)", () => {
  it("katalog wczytany: od razu piny w przywróconym kadrze", () => {
    const wynik = pinyPrzywroconegoKadru(piny, kielce, { trybKadru: false, daneWDrodze: false });
    expect(wynik?.map((p) => p.id)).toEqual([1, 2]);
  });

  it("tryb kadrowy (F-17): bez skrótu, piny przyjdą z zapytania o nowy kadr", () => {
    expect(pinyPrzywroconegoKadru(piny, kielce, { trybKadru: true, daneWDrodze: false })).toBeNull();
  });

  it("dane w drodze: bez skrótu, pokaże je przeliczenie po dojściu danych", () => {
    expect(pinyPrzywroconegoKadru(piny, kielce, { trybKadru: false, daneWDrodze: true })).toBeNull();
  });

  it("pusty kadr = pusta lista, nie null", () => {
    const morze = L.latLngBounds([55, 18], [55.1, 18.1]);
    expect(pinyPrzywroconegoKadru(piny, morze, { trybKadru: false, daneWDrodze: false })).toEqual([]);
  });
});
