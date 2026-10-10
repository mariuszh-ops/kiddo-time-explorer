import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Suspense, startTransition, useLayoutEffect, type ReactNode } from "react";
import { useActivityFilters } from "@/hooks/useActivityFilters";
import { useMapUrlState } from "@/hooks/useMapUrlState";

/**
 * AF-5-065 + FMN-B23: zapis adresu, gdy filtr idzie przejściem (startTransition).
 *
 * Opcja „Kategorii” zapisuje filtr w startTransition (MultiFilterDropdown), żeby
 * przerenderowanie listy nie blokowało malowania po kliknięciu. Do commitu
 * przejścia router oddaje STARY adres, a react-router 6.30 podaje do
 * `setSearchParams(prev => …)` właśnie ten stary `searchParams` z domknięcia.
 * Ruch mapy w tym oknie (moveend → handleSaveMapState) zapisywał więc kadr na
 * adresie bez świeżej kategorii i kategoria znikała.
 *
 * Przejście trzymamy „w toku” deterministycznie: `Bramka` wstrzymuje (Suspense)
 * render adresu po filtrze, dopóki test jej nie otworzy. Callbacki bierzemy
 * z renderu sprzed kliknięcia — tak jak Index, który do commitu się nie
 * przerenderowuje.
 */

const START = "view=map&lat=52.22970&lng=21.01220&zoom=11";
// toggleArrayFilter dopisuje `type` na końcu adresu.
const PO_FILTRZE = `${START}&type=zoo`;

let otwarta = false;
let otworz: () => void = () => {};
let brama: Promise<void> = Promise.resolve();
function nowaBrama() {
  otwarta = false;
  brama = new Promise<void>((r) => {
    otworz = () => {
      otwarta = true;
      r();
    };
  });
}

function Bramka() {
  const { search } = useLocation();
  if (!otwarta && search === `?${PO_FILTRZE}`) throw brama;
  return null;
}

function useStanowisko() {
  const filtry = useActivityFilters();
  const [params, setParams] = useSearchParams();
  const mapa = useMapUrlState(params, setParams);
  const location = useLocation();
  const navigate = useNavigate();
  // handleSaveMapState czyta window.location (bezpiecznik zapisu bez zmian):
  // w MemoryRouterze przepisujemy tam adres routera po każdym commicie
  // (jak stanowisko FMN-10 w filtryMapaSekwencje.test.tsx).
  useLayoutEffect(() => {
    window.history.replaceState(null, "", location.pathname + location.search);
  }, [location.pathname, location.search]);
  return { ...filtry, ...mapa, search: params.toString(), navigate };
}

const wrapper =
  (...wpisy: string[]) =>
  ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={wpisy} initialIndex={wpisy.length - 1}>
      <Suspense fallback={null}>
        <Bramka />
        {children}
      </Suspense>
    </MemoryRouter>
  );

const KADR = { center: [50.0614, 19.9366] as [number, number], zoom: 12, favoritesOnly: false };

describe("zapis adresu, gdy filtr kategorii czeka w przejściu (AF-5-065, FMN-B23)", () => {
  it("ruch mapy w czasie przejścia nie gubi świeżo wybranej kategorii", async () => {
    nowaBrama();
    const { result } = renderHook(useStanowisko, { wrapper: wrapper(`/?${START}`) });
    const przedKlikiem = result.current;

    await act(async () => {
      startTransition(() => przedKlikiem.toggleArrayFilter("type", "zoo"));
    });
    // Przejście wisi: router nadal oddaje adres sprzed kliknięcia.
    expect(result.current.search).toBe(START);

    // moveend w tym oknie — callback z renderu sprzed kliknięcia.
    act(() => przedKlikiem.handleSaveMapState(KADR));
    await act(async () => {
      otworz();
      await brama;
    });

    const s = new URLSearchParams(result.current.search);
    expect(s.get("type")).toBe("zoo");
    expect(s.get("lat")).toBe("50.06140");
    expect(s.get("zoom")).toBe("12");
    expect(result.current.filters.type).toEqual(["zoo"]);
    // Filtr nadal ma własny wpis historii (push), kadr tylko go podmienił (replace).
    act(() => result.current.navigate(-1));
    expect(result.current.search).toBe(START);
  });

  it("drugi klik kategorii w czasie przejścia dokłada się do pierwszego", async () => {
    nowaBrama();
    const { result } = renderHook(useStanowisko, { wrapper: wrapper(`/?${START}`) });
    const przedKlikiem = result.current;

    await act(async () => {
      startTransition(() => przedKlikiem.toggleArrayFilter("type", "zoo"));
    });
    await act(async () => {
      startTransition(() => przedKlikiem.toggleArrayFilter("type", "park-rozrywki"));
    });

    expect(result.current.filters.type).toEqual(["zoo", "park-rozrywki"]);
    expect(new URLSearchParams(result.current.search).get("lat")).toBe("52.22970");
  });

  it("„wstecz” w czasie przejścia: następny zapis startuje od adresu po cofnięciu", async () => {
    nowaBrama();
    const { result } = renderHook(useStanowisko, { wrapper: wrapper("/", `/?${START}`) });
    const przedKlikiem = result.current;

    await act(async () => {
      startTransition(() => przedKlikiem.toggleArrayFilter("type", "zoo"));
    });
    // „Wstecz” zanim przejście się skończyło: historia wraca do adresu bez filtra.
    act(() => przedKlikiem.navigate(-1));
    expect(result.current.search).toBe(START);

    // Klik innej kategorii po cofnięciu nie może wskrzesić cofniętego „zoo”.
    act(() => result.current.toggleArrayFilter("type", "plac-zabaw"));

    expect(result.current.filters.type).toEqual(["plac-zabaw"]);
  });
});
