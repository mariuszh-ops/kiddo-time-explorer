import { describe, expect, it } from "vitest";
import { ignorujUlubioneZAdresu, pustaMapaBezUlubionych } from "@/lib/ulubioneNaMapie";

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
