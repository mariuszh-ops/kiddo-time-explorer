import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter, type SetURLSearchParams } from "react-router-dom";
import { przepiszStareCats, useMapUrlState, type KategorieWAdresie } from "@/hooks/useMapUrlState";

/**
 * Regresja pętli zapisów adresu na widoku mapy.
 *
 * `setSearchParams` z react-routera zmienia tożsamość po każdej zmianie adresu.
 * Efekt startowy w `ViewportFilter` trzymał w zależnościach callback zbudowany
 * na `handleSaveMapState`, więc każdy zapis adresu restartował ten efekt, a ten
 * 100 ms później zapisywał znowu. Dopóki mapa animowała kadr, każdy obrót pętli
 * łapał inny środek — adres zmieniał się w kółko, cała strona renderowała się
 * po kilka razy na sekundę, pasek filtrów migotał i nie dawał się kliknąć.
 *
 * Bezpiecznik: zapis, który NIC nie zmienia w adresie, nie może wołać
 * `setSearchParams` — bo samo `navigate()` wystarcza, by pchnąć pętlę dalej.
 */
function ustawAdres(search: string) {
  window.history.replaceState({}, "", `/${search}`);
}

function zamontuj(setSearchParams: SetURLSearchParams) {
  return renderHook(
    () => useMapUrlState(new URLSearchParams(window.location.search), setSearchParams),
    // useLocation() potrzebuje routera; ścieżka "/" zgadza się z jsdomowym
    // window.location.pathname, więc bezpiecznik isStillOnThisRoute przepuszcza.
    { wrapper: ({ children }) => <MemoryRouter initialEntries={["/"]}>{children}</MemoryRouter> },
  );
}

describe("useMapUrlState — zapis stanu mapy", () => {
  it("nie zapisuje adresu, gdy środek, zoom i chipsy się nie zmieniły", () => {
    ustawAdres("?view=map&region=mazowieckie&type=plac-zabaw&lat=52.22970&lng=21.01220&zoom=11");
    const setSearchParams = vi.fn() as unknown as SetURLSearchParams;
    const { result } = zamontuj(setSearchParams);

    act(() => {
      result.current.handleSaveMapState({
        center: [52.2297, 21.0122],
        zoom: 11,
        favoritesOnly: false,
      });
    });

    expect(setSearchParams).not.toHaveBeenCalled();
  });

  it("zapisuje, gdy mapa faktycznie się przesunęła", () => {
    ustawAdres("?view=map&lat=52.22970&lng=21.01220&zoom=11");
    const setSearchParams = vi.fn() as unknown as SetURLSearchParams;
    const { result } = zamontuj(setSearchParams);

    act(() => {
      result.current.handleSaveMapState({
        center: [50.0614, 19.9366],
        zoom: 12,
        favoritesOnly: false,
      });
    });

    expect(setSearchParams).toHaveBeenCalledTimes(1);
  });

  it("zapisuje włączone „Ulubione”, ale powtórzenie tego samego stanu już nie", () => {
    ustawAdres("?view=map&lat=52.22970&lng=21.01220&zoom=11");
    const setSearchParams = vi.fn() as unknown as SetURLSearchParams;
    const { result } = zamontuj(setSearchParams);
    const stan = {
      center: [52.2297, 21.0122] as [number, number],
      zoom: 11,
      favoritesOnly: true,
    };

    act(() => result.current.handleSaveMapState(stan));
    expect(setSearchParams).toHaveBeenCalledTimes(1);

    // Adres po zapisie routera (w teście symulujemy go ręcznie).
    ustawAdres("?view=map&lat=52.22970&lng=21.01220&zoom=11&fav=1");
    const { result: drugi } = zamontuj(setSearchParams);
    act(() => drugi.current.handleSaveMapState(stan));

    expect(setSearchParams).toHaveBeenCalledTimes(1);
  });

  it("nie zapisuje nic, gdy adres nie jest już widokiem mapy", () => {
    ustawAdres("?region=mazowieckie");
    const setSearchParams = vi.fn() as unknown as SetURLSearchParams;
    const { result } = zamontuj(setSearchParams);

    act(() => {
      result.current.handleSaveMapState({
        center: [52.2297, 21.0122],
        zoom: 11,
        favoritesOnly: false,
      });
    });

    expect(setSearchParams).not.toHaveBeenCalled();
  });
});

/**
 * FMN-B02: chip mapy był drugim, niezależnym filtrem (`?cats=`) nakładanym na
 * zbiór przycięty do `type`. Teraz chip = `type`, a `cats` przychodzi już tylko
 * ze starych linków i jest przepisywany raz, przy wejściu.
 */
describe("useMapUrlState — chipy kategorii to filtr `type`, nie `cats`", () => {
  it("zapis stanu mapy nigdy nie dopisuje `cats` z `type`", () => {
    ustawAdres("?view=map&region=mazowieckie&type=plac-zabaw&lat=52.22970&lng=21.01220&zoom=11");
    const setSearchParams = vi.fn() as unknown as SetURLSearchParams;
    const { result } = zamontuj(setSearchParams);

    act(() => result.current.handleSaveMapState({ center: [50.0614, 19.9366], zoom: 12, favoritesOnly: false }));

    expect(setSearchParams).toHaveBeenCalledTimes(1);
    const updater = vi.mocked(setSearchParams).mock.calls[0][0] as (p: URLSearchParams) => URLSearchParams;
    const po = updater(new URLSearchParams(window.location.search));
    expect(po.has("cats")).toBe(false);
    expect(po.get("type")).toBe("plac-zabaw");
  });

  it("stary link z ?cats= przepisuje się raz, przez replace", () => {
    ustawAdres("?view=map&lat=52.22970&lng=21.01220&zoom=11&cats=zoo,park");
    const setSearchParams = vi.fn() as unknown as SetURLSearchParams;
    zamontuj(setSearchParams);

    expect(setSearchParams).toHaveBeenCalledTimes(1);
    const [updater, opcje] = vi.mocked(setSearchParams).mock.calls[0] as unknown as [
      (p: URLSearchParams) => URLSearchParams,
      { replace?: boolean },
    ];
    expect(opcje).toEqual({ replace: true });
    const po = updater(new URLSearchParams(window.location.search));
    expect(po.get("type")).toBe("zoo,park");
    expect(po.has("cats")).toBe(false);
  });

  it("bez ?cats= przy wejściu nie ma żadnego zapisu", () => {
    ustawAdres("?view=map&type=zoo&lat=52.22970&lng=21.01220&zoom=11");
    const setSearchParams = vi.fn() as unknown as SetURLSearchParams;
    zamontuj(setSearchParams);
    expect(setSearchParams).not.toHaveBeenCalled();
  });
});

describe("przepiszStareCats — stary link pokazuje ten sam widok", () => {
  const KADR = "view=map&lat=52.22970&lng=21.01220&zoom=11";
  const przypadki: [string, KategorieWAdresie, string, Record<string, string | null>][] = [
    // Bez `type` stary kod pokazywał piny kategorii z `cats`.
    ["same cats (home)", "wiele", `?${KADR}&cats=zoo,park`, { type: "zoo,park", cats: null }],
    // Z `type` pokazywał piny `type` (chipy z `cats` działały na zbiorze już przyciętym).
    ["type wygrywa z cats", "wiele", `?${KADR}&type=plac-zabaw&cats=plac-zabaw,zoo`, { type: "plac-zabaw", cats: null }],
    ["Ulubione -> fav=1", "wiele", `?${KADR}&cats=_favorites,zoo`, { type: "zoo", fav: "1", cats: null }],
    ["nieznana kategoria odpada", "wiele", `?${KADR}&cats=bzdura`, { type: null, cats: null }],
    ["województwo: jedna kategoria", "jedna", `?${KADR}&cats=zoo`, { type: "zoo", cats: null }],
    ["województwo: kilku nie wyrazi jedno `type`", "jedna", `?${KADR}&cats=zoo,park`, { type: null, cats: null }],
    ["kategoria w ścieżce", "sciezka", `?${KADR}&cats=zoo,_favorites`, { type: null, fav: "1", cats: null }],
    // Bez kadru savedMapState był null, więc `cats` nic nie robił.
    ["bez lat/lng/zoom cats nie działał", "wiele", "?view=map&cats=zoo", { type: null, cats: null }],
  ];

  it.each(przypadki)("%s", (_nazwa, tryb, adres, oczekiwane) => {
    const p = new URLSearchParams(adres);
    expect(przepiszStareCats(p, tryb)).toBe(true);
    for (const [klucz, wartosc] of Object.entries(oczekiwane)) expect(p.get(klucz)).toBe(wartosc);
  });

  it("widok listy zostawia adres w spokoju (tam `cats` nic nie znaczył)", () => {
    const p = new URLSearchParams("?cats=zoo&view=MAP");
    expect(przepiszStareCats(p, "wiele")).toBe(false);
    expect(p.toString()).toBe("cats=zoo&view=MAP");
  });
});
