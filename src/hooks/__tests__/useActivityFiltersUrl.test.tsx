import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { ReactNode } from "react";
import { useActivityFilters } from "@/hooks/useActivityFilters";

/**
 * Pilnuje jednego źródła prawdy dla filtrów: adresu.
 *
 * Tło: gdy filtry miały drugą kopię w `useState`, efekty URL→stan i stan→URL
 * chodziły w przeciwfazie — `?type=` znikało i wracało ~3×/s, chip „Kategoria"
 * mrugał i nie dawał się kliknąć (nagranie z 18.09.2026). Testy poniżej nie
 * odtwarzają samego wyścigu (to artefakt kolejki efektów), tylko przypinają
 * własności, które go wykluczają: filtry liczone z adresu i zapis funkcyjny,
 * który nie nadpisuje adresu starym snapshotem.
 */
function useHarness() {
  const api = useActivityFilters();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  return { ...api, search: params.toString(), setParams, locationKey: location.key, navigate };
}

const wrapper = (...entries: string[]) =>
  ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>{children}</MemoryRouter>
  );

const MAPA = "?region=mazowieckie&age=3-5&view=map&lat=52.29&lng=21.20&zoom=8&fav=1&type=park-rozrywki";

describe("useActivityFilters — filtry liczone z adresu", () => {
  it("kategorie z adresu widać już przy pierwszym renderze", () => {
    const { result } = renderHook(useHarness, {
      wrapper: wrapper("/?region=mazowieckie&type=park-rozrywki,plac-zabaw"),
    });
    expect(result.current.filters.type).toEqual(["park-rozrywki", "plac-zabaw"]);
    expect(result.current.filters.city).toBe("mazowieckie");
  });

  it("zapis filtra nie kasuje parametrów mapy zapisanych obok", () => {
    const { result } = renderHook(useHarness, { wrapper: wrapper("/" + MAPA) });

    act(() => result.current.toggleArrayFilter("type", "plac-zabaw"));

    const s = new URLSearchParams(result.current.search);
    expect(s.get("type")).toBe("park-rozrywki,plac-zabaw");
    expect(s.get("fav")).toBe("1");
    expect(s.get("lat")).toBe("52.29");
    expect(s.get("zoom")).toBe("8");
    expect(s.get("view")).toBe("map");
  });

  it("zewnętrzny zapis adresu (mapa) nie gubi wybranej kategorii", () => {
    const { result } = renderHook(useHarness, { wrapper: wrapper("/" + MAPA) });

    // tak zapisuje się stan mapy w useMapUrlState — funkcyjnie, od świeżego prev
    act(() =>
      result.current.setParams(
        (prev) => {
          prev.set("zoom", "9");
          prev.delete("fav");
          return prev;
        },
        { replace: true },
      ),
    );

    expect(result.current.filters.type).toEqual(["park-rozrywki"]);
    expect(new URLSearchParams(result.current.search).get("type")).toBe("park-rozrywki");
  });

  it("„wyczyść filtry\" kasuje filtry, ale zostawia widok mapy", () => {
    const { result } = renderHook(useHarness, { wrapper: wrapper("/" + MAPA) });

    act(() => result.current.clearAllFilters());

    const s = new URLSearchParams(result.current.search);
    expect(s.get("type")).toBeNull();
    expect(s.get("region")).toBeNull();
    expect(s.get("age")).toBeNull();
    expect(s.get("view")).toBe("map");
    expect(s.get("fav")).toBe("1");
  });

  // FMN-B06: „Pokaż wyniki" w arkuszu bez zmian zapisuje promień (undefined przy
  // 0 km) i dokładał wpis z identycznym adresem — „wstecz" nic nie zmieniało.
  it("zapis filtra bez zmiany wartości nie dokłada wpisu w historii", () => {
    const { result } = renderHook(useHarness, {
      wrapper: wrapper("/", "/?type=muzeum-teatr%2Csport&region=malopolskie"),
    });
    const kluczPrzed = result.current.locationKey;

    act(() => result.current.updateFilter("distance", undefined));
    act(() => result.current.updateFilter("city", "malopolskie"));
    act(() => result.current.updateFilter("type", ["muzeum-teatr", "sport"]));

    expect(result.current.locationKey).toBe(kluczPrzed);

    act(() => result.current.navigate(-1));
    expect(result.current.search).toBe("");
  });

  it("zmiana wartości filtra nadal zostawia wpis w historii", () => {
    const { result } = renderHook(useHarness, {
      wrapper: wrapper("/", "/?region=malopolskie"),
    });
    const kluczPrzed = result.current.locationKey;

    act(() => result.current.updateFilter("distance", 10));

    expect(result.current.locationKey).not.toBe(kluczPrzed);
    expect(new URLSearchParams(result.current.search).get("dist")).toBe("10");

    act(() => result.current.navigate(-1));
    expect(result.current.search).toBe("region=malopolskie");
  });
});
