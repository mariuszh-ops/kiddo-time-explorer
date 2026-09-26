import { describe, expect, it } from "vitest";
import { pierwszaStronaListy, stanListy } from "@/lib/categoryListReturn";

/**
 * FMN-B21: stan wpisu historii rozstrzyga, czy ?page=N to "strony 1..N"
 * (zapis "Pokaż więcej") czy "sama strona N" (link paginacji SEO, K-03).
 */
describe("categoryListReturn — pierwsza strona listy w stanie wpisu", () => {
  it("wpis bez stanu (link paginacji, wklejony adres) = sama strona z adresu", () => {
    expect(pierwszaStronaListy(null, 1)).toBe(1);
    expect(pierwszaStronaListy(undefined, 0)).toBe(0);
    expect(pierwszaStronaListy({ inne: 1 }, 3)).toBe(3);
  });

  it("zapis 'Pokaż więcej' wraca po odczycie", () => {
    expect(pierwszaStronaListy(stanListy(null, 0, 1), 1)).toBe(0);
    expect(pierwszaStronaListy(stanListy(null, 2, 4), 4)).toBe(2);
  });

  it("zapis niepasujący do adresu albo uszkodzony jest pomijany", () => {
    // Ktoś zmienił ?page= ręcznie na mniejsze niż zapisany początek.
    expect(pierwszaStronaListy({ ffListaOd: 3 }, 1)).toBe(1);
    expect(pierwszaStronaListy({ ffListaOd: -1 }, 2)).toBe(2);
    expect(pierwszaStronaListy({ ffListaOd: 0.5 }, 2)).toBe(2);
    expect(pierwszaStronaListy({ ffListaOd: "0" }, 2)).toBe(2);
    expect(pierwszaStronaListy([0], 2)).toBe(2);
  });

  it("lista od strony z adresu nie zostawia zapisu", () => {
    expect(stanListy(null, 1, 1)).toBeUndefined();
    expect(stanListy({ ffListaOd: 0 }, 0, 0)).toBeUndefined();
  });

  it("cudzy stan wpisu zostaje nietknięty", () => {
    expect(stanListy({ z: "home" }, 0, 2)).toEqual({ z: "home", ffListaOd: 0 });
    expect(stanListy({ z: "home", ffListaOd: 0 }, 2, 2)).toEqual({ z: "home" });
  });
});
