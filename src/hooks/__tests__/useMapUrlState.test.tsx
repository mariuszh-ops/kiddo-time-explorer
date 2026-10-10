import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter, type SetURLSearchParams } from "react-router-dom";
import {
  latDoAdresu,
  lngDoAdresu,
  MAX_LAT_MERCATORA,
  przepiszStareCats,
  useMapUrlState,
  zoomDoAdresu,
  ZOOM_MAX,
  ZOOM_MIN,
  type KategorieWAdresie,
} from "@/hooks/useMapUrlState";

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

  // FMN-11 (dzien_0310 w5): `/?view=map&region=podlaskie&cats=_favorites` dawało 5 replace
  // przy wejściu (I2, W1 pozwala na 4): osobny zapis zdejmujący `cats`, a zaraz po nim zapis kadru.
  it("stary ?cats= bez kadru: brak osobnego zapisu, `cats` znika w pierwszym zapisie kadru", () => {
    ustawAdres("?view=map&region=podlaskie&cats=_favorites");
    const setSearchParams = vi.fn() as unknown as SetURLSearchParams;
    const { result } = zamontuj(setSearchParams);

    expect(setSearchParams).not.toHaveBeenCalled();

    act(() => result.current.handleSaveMapState({ center: [53.1325, 23.1688], zoom: 11, favoritesOnly: false }));

    expect(setSearchParams).toHaveBeenCalledTimes(1);
    const [updater, opcje] = vi.mocked(setSearchParams).mock.calls[0] as unknown as [
      (p: URLSearchParams) => URLSearchParams,
      { replace?: boolean },
    ];
    expect(opcje).toEqual({ replace: true });
    const po = updater(new URLSearchParams(window.location.search));
    // Ten sam adres końcowy co wcześniej (przepisanie + zapis kadru): bez `cats`, bez `fav`.
    expect(po.toString()).toBe("view=map&region=podlaskie&lat=53.13250&lng=23.16880&zoom=11");
  });

  // FMN-B84, decyzja CC 10.10 (wariant 1): „Ulubione" z adresu działają tylko razem z kadrem.
  // Aplikacja zawsze zapisuje `fav` obok lat/lng/zoom; bez kadru filtr znika dla każdej roli.
  it("fav=1 z kadrem: stan mapy z adresu ma „Ulubione”", () => {
    ustawAdres("?view=map&fav=1&lat=52.00000&lng=19.00000&zoom=6");
    const { result } = zamontuj(vi.fn() as unknown as SetURLSearchParams);
    expect(result.current.savedMapState).toEqual({ center: [52, 19], zoom: 6, favoritesOnly: true });
  });

  it("fav=1 bez kadru: brak stanu mapy z adresu, pierwszy zapis kadru zdejmuje `fav`", () => {
    ustawAdres("?view=map&fav=1");
    const setSearchParams = vi.fn() as unknown as SetURLSearchParams;
    const { result } = zamontuj(setSearchParams);

    expect(result.current.savedMapState).toBeNull();
    expect(setSearchParams).not.toHaveBeenCalled();

    // MapView startuje bez „Ulubionych" (savedMapState = null), więc zapisuje favoritesOnly: false.
    act(() => result.current.handleSaveMapState({ center: [52.2297, 21.0122], zoom: 11, favoritesOnly: false }));

    expect(setSearchParams).toHaveBeenCalledTimes(1);
    const [updater, opcje] = vi.mocked(setSearchParams).mock.calls[0] as unknown as [
      (p: URLSearchParams) => URLSearchParams,
      { replace?: boolean },
    ];
    expect(opcje).toEqual({ replace: true });
    const po = updater(new URLSearchParams(window.location.search));
    expect(po.toString()).toBe("view=map&lat=52.22970&lng=21.01220&zoom=11");
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

describe("FMN-B61 — zapis zoomu zawsze w zakresie, który adres odtworzy", () => {
  it("zoomDoAdresu przycina do ZOOM_MIN..ZOOM_MAX i zaokrągla", () => {
    expect(zoomDoAdresu(0)).toBe(String(ZOOM_MIN));
    expect(zoomDoAdresu(2)).toBe(String(ZOOM_MIN));
    expect(zoomDoAdresu(2.6)).toBe(String(ZOOM_MIN));
    expect(zoomDoAdresu(3)).toBe("3");
    expect(zoomDoAdresu(11.4)).toBe("11");
    expect(zoomDoAdresu(19)).toBe("19");
    expect(zoomDoAdresu(25)).toBe(String(ZOOM_MAX));
  });

  it.each([0, 1, 2, 2.4, 20, 25])("zapis stanu mapy z zoomem %s daje zoom, który F5 przyjmie", (zoom) => {
    ustawAdres("?view=map&lat=52.00000&lng=19.00000&zoom=3");
    const setSearchParams = vi.fn() as unknown as SetURLSearchParams;
    const { result } = zamontuj(setSearchParams);

    act(() => result.current.handleSaveMapState({ center: [52, 19], zoom, favoritesOnly: false }));

    const wywolania = vi.mocked(setSearchParams).mock.calls;
    const po = wywolania.length
      ? (wywolania[0][0] as (p: URLSearchParams) => URLSearchParams)(new URLSearchParams(window.location.search))
      : new URLSearchParams(window.location.search);
    const z = Number(po.get("zoom"));
    expect(Number.isInteger(z)).toBe(true);
    expect(z).toBeGreaterThanOrEqual(ZOOM_MIN);
    expect(z).toBeLessThanOrEqual(ZOOM_MAX);

    // To, co zapisaliśmy, wraca przy wejściu z adresu (F5 / link) jako zapisany kadr.
    ustawAdres(`?${po.toString()}`);
    const { result: poF5 } = zamontuj(vi.fn() as unknown as SetURLSearchParams);
    expect(poF5.current.savedMapState?.zoom).toBe(z);
  });
});

describe("FMN-6-009 — zapis długości geograficznej w zakresie, który adres odtworzy", () => {
  it("lngDoAdresu zawija kopię świata do -180..180, wartość w zakresie zostaje", () => {
    expect(lngDoAdresu(21.0122)).toBe("21.01220");
    expect(lngDoAdresu(179.5)).toBe("179.50000");
    expect(lngDoAdresu(180)).toBe("180.00000");
    expect(lngDoAdresu(-180)).toBe("-180.00000");
    expect(lngDoAdresu(190.48)).toBe("-169.52000");
    expect(lngDoAdresu(197.66602)).toBe("-162.33398");
    expect(lngDoAdresu(-190)).toBe("170.00000");
    expect(lngDoAdresu(381.0122)).toBe("21.01220");
  });

  it.each([190.48, 197.66602, -200.5, 540.25])(
    "przeciągnięcie za antypołudnik (lng %s) zapisuje lng, który F5 przyjmie, a powtórka nie zapisuje",
    (lng) => {
      ustawAdres("?view=map&lat=52.00000&lng=179.50000&zoom=6");
      const setSearchParams = vi.fn() as unknown as SetURLSearchParams;
      const { result } = zamontuj(setSearchParams);

      act(() => result.current.handleSaveMapState({ center: [52, lng], zoom: 6, favoritesOnly: false }));

      const wywolania = vi.mocked(setSearchParams).mock.calls;
      expect(wywolania).toHaveLength(1);
      const po = (wywolania[0][0] as (p: URLSearchParams) => URLSearchParams)(
        new URLSearchParams(window.location.search),
      );
      const zapisany = Number(po.get("lng"));
      expect(zapisany).toBeGreaterThanOrEqual(-180);
      expect(zapisany).toBeLessThanOrEqual(180);
      // Ten sam punkt Ziemi: różnica o całkowitą wielokrotność 360 stopni.
      expect(Math.abs(((lng - zapisany) % 360 + 360) % 360) < 1e-4 ||
        Math.abs(((lng - zapisany) % 360 + 360) % 360 - 360) < 1e-4).toBe(true);

      // F5 / link: zapisany kadr wraca jako savedMapState (wcześniej null = Warszawa zoom 11).
      ustawAdres(`?${po.toString()}`);
      const drugiSet = vi.fn() as unknown as SetURLSearchParams;
      const { result: poF5 } = zamontuj(drugiSet);
      expect(poF5.current.savedMapState?.center[1]).toBe(zapisany);
      expect(poF5.current.savedMapState?.zoom).toBe(6);

      // Mapa dalej stoi na kopii świata (lng poza zakresem) - kolejny moveend nie zapisuje drugi raz.
      act(() => poF5.current.handleSaveMapState({ center: [52, lng], zoom: 6, favoritesOnly: false }));
      expect(drugiSet).not.toHaveBeenCalled();
    },
  );
});

describe("FMN-6-012 — zapis szerokości geograficznej w zakresie rzutu mapy", () => {
  it("latDoAdresu przycina do granicy Web Mercatora, wartość w zakresie zostaje", () => {
    expect(latDoAdresu(52.2297)).toBe("52.22970");
    expect(latDoAdresu(85)).toBe("85.00000");
    expect(latDoAdresu(MAX_LAT_MERCATORA)).toBe("85.05113");
    expect(latDoAdresu(88.13919)).toBe("85.05113");
    expect(latDoAdresu(90)).toBe("85.05113");
    expect(latDoAdresu(-87.5)).toBe("-85.05113");
    expect(latDoAdresu(-12.5)).toBe("-12.50000");
  });

  it.each([88.13919, 87.89628, -88.2])(
    "przeciągnięcie ponad biegun (lat %s) zapisuje lat, który F5 odtworzy, a powtórka nie zapisuje",
    (lat) => {
      ustawAdres("?view=map&lat=85.00543&lng=0.00000&zoom=3");
      const setSearchParams = vi.fn() as unknown as SetURLSearchParams;
      const { result } = zamontuj(setSearchParams);

      act(() => result.current.handleSaveMapState({ center: [lat, 0], zoom: 3, favoritesOnly: false }));

      const wywolania = vi.mocked(setSearchParams).mock.calls;
      expect(wywolania).toHaveLength(1);
      const po = (wywolania[0][0] as (p: URLSearchParams) => URLSearchParams)(
        new URLSearchParams(window.location.search),
      );
      expect(po.get("lat")).toBe(lat > 0 ? "85.05113" : "-85.05113");

      // F5 / link: Leaflet rzutuje środek z przycięciem do MAX_LAT_MERCATORA, więc kadr
      // po F5 ma tę samą szerokość co adres (wcześniej adres 88.1, mapa 85.05113).
      ustawAdres(`?${po.toString()}`);
      const drugiSet = vi.fn() as unknown as SetURLSearchParams;
      const { result: poF5 } = zamontuj(drugiSet);
      expect(poF5.current.savedMapState?.center[0]).toBe(Number(po.get("lat")));

      // Mapa dalej stoi ponad biegunem - kolejny moveend nie zapisuje drugi raz,
      // a środek po rzutowaniu (±85.0511287798) daje ten sam adres.
      act(() => poF5.current.handleSaveMapState({ center: [lat, 0], zoom: 3, favoritesOnly: false }));
      act(() =>
        poF5.current.handleSaveMapState({
          center: [Math.sign(lat) * MAX_LAT_MERCATORA, 0],
          zoom: 3,
          favoritesOnly: false,
        }),
      );
      expect(drugiSet).not.toHaveBeenCalled();
    },
  );
});
