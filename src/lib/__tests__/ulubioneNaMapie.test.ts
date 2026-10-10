import { describe, expect, it } from "vitest";
import {
  ignorujUlubioneZAdresu,
  pustaMapaBezUlubionych,
  ulubioneZalogowanegoWDrodze,
  type UlubioneZalogowanego,
} from "@/lib/ulubioneNaMapie";

describe("FMN-B84: fav=1 z adresu", () => {
  it("gość bez ulubionych: fav=1 ignorowane (link od innego rodzica)", () => {
    expect(ignorujUlubioneZAdresu({ authGotowy: true, zalogowany: false, liczbaUlubionych: 0 })).toBe(true);
  });

  it("przed odczytem sesji nic nie zdejmujemy (zalogowany wyglądałby jak gość)", () => {
    expect(ignorujUlubioneZAdresu({ authGotowy: false, zalogowany: false, liczbaUlubionych: 0 })).toBe(false);
  });

  it("gość z lokalnymi ulubionymi i zalogowany zachowują filtr", () => {
    expect(ignorujUlubioneZAdresu({ authGotowy: true, zalogowany: false, liczbaUlubionych: 2 })).toBe(false);
    expect(ignorujUlubioneZAdresu({ authGotowy: true, zalogowany: true, liczbaUlubionych: 0 })).toBe(false);
  });
});

describe("FMN-B84: pusty stan mapy", () => {
  it("chip Ulubione bez żadnego ulubionego = komunikat o ulubionych, nie „oddal mapę”", () => {
    expect(pustaMapaBezUlubionych(true, 0)).toBe(true);
  });

  it("są ulubione albo chip wyłączony = zwykły pusty kadr", () => {
    expect(pustaMapaBezUlubionych(true, 3)).toBe(false);
    expect(pustaMapaBezUlubionych(false, 0)).toBe(false);
  });
});

// S5 10.10: link z fav=1 u zalogowanego z ulubionymi na nowym urządzeniu pokazywał przez
// ok. 0,4–0,7 s „0 atrakcji w widoku" i „Nie masz jeszcze ulubionych" (prod 3/3), zanim
// przyszły ulubione z serwera. Teraz to „dane w drodze" mapy (Wczytuję).
describe("FMN-B84: ulubione zalogowanego w drodze", () => {
  const baza: UlubioneZalogowanego = { tylkoUlubione: true, zalogowany: true, ulubioneWczytane: false };

  it("zalogowany, chip Ulubione, odczyt zapisanych nieskończony = dane w drodze", () => {
    expect(ulubioneZalogowanegoWDrodze(baza)).toBe(true);
  });

  it("odczyt skończony (także błędem) = nie czekamy; zero ulubionych to wtedy prawda", () => {
    expect(ulubioneZalogowanegoWDrodze({ ...baza, ulubioneWczytane: true })).toBe(false);
  });

  it("gość albo chip wyłączony = nie czekamy", () => {
    expect(ulubioneZalogowanegoWDrodze({ ...baza, zalogowany: false })).toBe(false);
    expect(ulubioneZalogowanegoWDrodze({ ...baza, tylkoUlubione: false })).toBe(false);
  });
});
