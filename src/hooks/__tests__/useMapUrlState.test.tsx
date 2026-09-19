import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter, type SetURLSearchParams } from "react-router-dom";
import { useMapUrlState } from "@/hooks/useMapUrlState";

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
        selectedCategories: new Set(),
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
        selectedCategories: new Set(),
      });
    });

    expect(setSearchParams).toHaveBeenCalledTimes(1);
  });

  it("zapisuje pierwsze chipsy, ale powtórzenie tego samego zestawu już nie", () => {
    ustawAdres("?view=map&lat=52.22970&lng=21.01220&zoom=11");
    const setSearchParams = vi.fn() as unknown as SetURLSearchParams;
    const { result } = zamontuj(setSearchParams);
    const stan = {
      center: [52.2297, 21.0122] as [number, number],
      zoom: 11,
      selectedCategories: new Set(["plac-zabaw"]),
    };

    act(() => result.current.handleSaveMapState(stan));
    expect(setSearchParams).toHaveBeenCalledTimes(1);

    // Adres po zapisie routera (w teście symulujemy go ręcznie).
    ustawAdres("?view=map&lat=52.22970&lng=21.01220&zoom=11&cats=plac-zabaw");
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
        selectedCategories: new Set(),
      });
    });

    expect(setSearchParams).not.toHaveBeenCalled();
  });
});
