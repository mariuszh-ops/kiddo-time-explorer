import { beforeEach, describe, expect, it } from "vitest";
import { czytajPrzewiniecieKarty, zapiszPrzewiniecieKarty } from "@/lib/cardScrollReturn";

/**
 * GL-4-057/058: przewiniecie karty atrakcji siedzi w stanie wpisu historii.
 * Zapis nie rusza pol react-routera ani zapisu listy (FMN-B03) i trafia
 * tylko do "swojego" wpisu.
 */
describe("cardScrollReturn — przewiniecie karty w history.state", () => {
  beforeEach(() => {
    window.history.replaceState({ usr: null, key: "karta", idx: 2 }, "");
  });

  it("nowy wpis nie ma zapisu", () => {
    expect(czytajPrzewiniecieKarty("karta")).toBeNull();
  });

  it("zapis wraca po odczycie i nie rusza pol routera ani zapisu listy", () => {
    window.history.replaceState({ ...window.history.state, ffLista: { strony: 2 } }, "");
    zapiszPrzewiniecieKarty("karta", 3373.4);
    expect(czytajPrzewiniecieKarty("karta")).toBe(3373);
    expect(window.history.state).toMatchObject({ usr: null, key: "karta", idx: 2, ffLista: { strony: 2 } });
  });

  it("cudzy klucz: zapis nic nie robi, odczyt daje null", () => {
    zapiszPrzewiniecieKarty("inna", 500);
    expect(window.history.state).not.toHaveProperty("ffKartaY");
    zapiszPrzewiniecieKarty("karta", 500);
    expect(czytajPrzewiniecieKarty("inna")).toBeNull();
  });

  it("zero i smieci w stanie = brak przywracania", () => {
    zapiszPrzewiniecieKarty("karta", 0);
    expect(czytajPrzewiniecieKarty("karta")).toBeNull();
    window.history.replaceState({ key: "karta", ffKartaY: "3373" }, "");
    expect(czytajPrzewiniecieKarty("karta")).toBeNull();
  });
});
