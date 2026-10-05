import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter, useLocation, useSearchParams } from "react-router-dom";
import { useMapUrlState } from "@/hooks/useMapUrlState";

/**
 * noc 06.10 wiersz 2 (K2, FMN-7-026): „Lista” na mapie strony głównej robi push
 * na `/` i lista z kadru musi jechać w stanie TEGO wpisu. Wcześniej żyła tylko
 * w pamięci Indexu, więc „wstecz” z karty atrakcji (nowy montaż) pokazywał pod
 * tym samym adresem inną listę: 20 kafli z kadru -> 10 kafli strony głównej.
 */
function zamontuj() {
  window.history.replaceState({}, "", "/?view=map&lat=52.22990&lng=21.01204&zoom=11");
  return renderHook(
    () => {
      const [searchParams, setSearchParams] = useSearchParams();
      const mapa = useMapUrlState(searchParams, setSearchParams);
      return { ...mapa, location: useLocation() };
    },
    {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={["/?view=map&lat=52.22990&lng=21.01204&zoom=11"]}>{children}</MemoryRouter>
      ),
    },
  );
}

describe("useMapUrlState — stan nowego wpisu przy przełączeniu widoku", () => {
  it("lista z kadru trafia do location.state wpisu „Lista”", () => {
    const { result } = zamontuj();
    const lista = [{ id: 7, title: "Jump Arena" }];

    act(() => {
      result.current.setViewMode("grid", { ffListaZKadru: lista });
    });

    expect(result.current.location.search).toBe("");
    expect(result.current.viewMode).toBe("grid");
    expect(result.current.location.state).toEqual({ ffListaZKadru: lista });
  });

  it("bez stanu przełączenie działa jak dotąd (wpis bez stanu)", () => {
    const { result } = zamontuj();

    act(() => {
      result.current.setViewMode("grid");
    });

    expect(result.current.location.search).toBe("");
    expect(result.current.location.state ?? null).toBeNull();
  });
});
