import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { czytajZapisListy, zapiszListe } from "@/lib/homeListReturn";

/**
 * FMN-B03: dlugosc listy i przewiniecie siedza w stanie wpisu historii.
 * Testy przypinaja trzy wlasnosci, od ktorych zalezy poprawny powrot z karty:
 * zapis nie rusza pol react-routera, trafia tylko do "swojego" wpisu
 * i nie produkuje zbednych replaceState (kazdy liczy sie w I2).
 */
describe("homeListReturn — stan listy w history.state", () => {
  beforeEach(() => {
    window.history.replaceState({ usr: null, key: "abc", idx: 3 }, "");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("nowy wpis nie ma zapisu", () => {
    expect(czytajZapisListy("abc")).toBeNull();
  });

  it("zapis wraca po odczycie i nie rusza pol routera", () => {
    zapiszListe("abc", { strony: 2 });
    zapiszListe("abc", { y: 3127 });
    expect(czytajZapisListy("abc")).toEqual({ strony: 2, y: 3127 });
    expect(window.history.state).toMatchObject({ usr: null, key: "abc", idx: 3 });
  });

  it("zapis z cudzym kluczem (animacja wyjscia) nic nie robi", () => {
    zapiszListe("inny", { strony: 5, y: 900 });
    expect(czytajZapisListy("abc")).toBeNull();
    expect(czytajZapisListy("inny")).toBeNull();
  });

  it("pierwszy wpis dokumentu ma klucz 'default'", () => {
    window.history.replaceState({ idx: 0 }, "");
    zapiszListe("default", { strony: 3 });
    expect(czytajZapisListy("default")).toEqual({ strony: 3 });
  });

  it("nie pisze stanu domyslnego ani tego, co juz jest", () => {
    const spy = vi.spyOn(window.history, "replaceState");
    zapiszListe("abc", { strony: 1 });
    expect(spy).not.toHaveBeenCalled();
    zapiszListe("abc", { strony: 2 });
    zapiszListe("abc", { strony: 2 });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("odrzuca uszkodzony zapis", () => {
    window.history.replaceState({ key: "abc", ffLista: { strony: "dwa", y: -5 } }, "");
    expect(czytajZapisListy("abc")).toBeNull();
    window.history.replaceState({ key: "abc", ffLista: { strony: 2, y: -5 } }, "");
    expect(czytajZapisListy("abc")).toEqual({ strony: 2 });
  });
});
