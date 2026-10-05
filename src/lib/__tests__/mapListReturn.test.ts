import { describe, expect, it } from "vitest";
import type { Activity } from "@/data/activities";
import { LIMIT_ZNAKOW_LISTY, listaZKadru, stanListyZKadru } from "@/lib/mapListReturn";

const atrakcja = (id: number, title = `A${id}`) => ({ id, title }) as unknown as Activity;

describe("mapListReturn — lista z kadru mapy w stanie wpisu (noc 06.10 wiersz 2)", () => {
  it("stan wpisu odtwarza tę samą listę w tej samej kolejności", () => {
    const lista = [atrakcja(3), atrakcja(1), atrakcja(2)];
    expect(listaZKadru(stanListyZKadru(lista))).toEqual(lista);
  });

  it("pusta lista z kadru to dalej lista (0 kafli), nie strona główna", () => {
    expect(listaZKadru(stanListyZKadru([]))).toEqual([]);
  });

  it("wpis bez listy (inne wejście na /) = null", () => {
    expect(listaZKadru(null)).toBeNull();
    expect(listaZKadru({ usr: null })).toBeNull();
    expect(listaZKadru({ ffListaZKadru: "x" })).toBeNull();
  });

  it("odrzuca śmieci z cudzego stanu", () => {
    expect(listaZKadru({ ffListaZKadru: [null, { id: "1" }, atrakcja(5)] })).toEqual([atrakcja(5)]);
  });

  it("za duża lista nie jedzie w historii", () => {
    const tytul = "x".repeat(1000);
    const lista = Array.from({ length: Math.ceil(LIMIT_ZNAKOW_LISTY / 1000) + 1 }, (_, i) => atrakcja(i, tytul));
    expect(stanListyZKadru(lista)).toBeUndefined();
  });
});
