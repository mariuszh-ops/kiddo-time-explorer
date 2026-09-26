import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

/**
 * FMN-B21: strona województwa po "wstecz" z karty (i po F5) ma wrócić z tymi
 * stronami, które rodzic doładował "Pokaż więcej" — a wejście z linku ?page=N
 * dalej pokazuje samą stronę N (K-03). Sprawdzamy kształt zapytań .range().
 */
const { zakresy, stan } = vi.hoisted(() => ({
  zakresy: [] as { od: number; do: number; zLicznikiem: boolean }[],
  stan: { wszystkich: 300, liczenia: 0 },
}));

vi.mock("@/lib/catalogClient", () => ({
  CARD_COLUMNS: "*",
  catalogClient: {},
  mapCatalogRow: (r: { id: string }) => ({ id: r.id }),
}));

vi.mock("@/lib/listingQuery", async (importOriginal) => {
  const oryginal = await importOriginal<typeof import("@/lib/listingQuery")>();
  return {
    ...oryginal,
    takeEarlyListing: () => null,
    buildListingQuery: (_f: unknown, opcje: { headOnly?: boolean; withCount?: boolean } = {}) => {
      if (opcje.headOnly) {
        stan.liczenia += 1;
        return Promise.resolve({ data: null, count: stan.wszystkich, error: null });
      }
      return {
        range: (od: number, doW: number) => {
          zakresy.push({ od, do: doW, zLicznikiem: Boolean(opcje.withCount) });
          const ile = Math.max(0, Math.min(doW, stan.wszystkich - 1) - od + 1);
          return Promise.resolve({
            data: Array.from({ length: ile }, (_, i) => ({ id: `a${od + i}` })),
            count: opcje.withCount ? stan.wszystkich : null,
            error: null,
          });
        },
      };
    },
  };
});

import { useActivitiesInfinite } from "@/hooks/useActivitiesInfinite";

const FILTRY = { region: "mazowieckie" };

describe("useActivitiesInfinite — strony startowe (FMN-B21)", () => {
  beforeEach(() => {
    zakresy.length = 0;
    stan.wszystkich = 300;
    stan.liczenia = 0;
  });

  it("zwykłe wejście: strona 1", async () => {
    const { result } = renderHook(() => useActivitiesInfinite(FILTRY, 24));
    await waitFor(() => expect(result.current.data).toHaveLength(24));
    expect(zakresy).toEqual([{ od: 0, do: 23, zLicznikiem: true }]);
    expect(result.current).toMatchObject({ page: 0, firstPage: 0, total: 300 });
  });

  it("link ?page=2 (bez zapisu): sama strona 2", async () => {
    const { result } = renderHook(() => useActivitiesInfinite(FILTRY, 24, 1));
    await waitFor(() => expect(result.current.data).toHaveLength(24));
    expect(zakresy).toEqual([{ od: 24, do: 47, zLicznikiem: true }]);
    expect(result.current).toMatchObject({ page: 1, firstPage: 1 });
    expect(result.current.data[0]).toEqual({ id: "a24" });
  });

  it("powrót po 'Pokaż więcej' (strony 1-2): 48 kafli od pierwszego, potem dokleja 3.", async () => {
    const { result } = renderHook(() => useActivitiesInfinite(FILTRY, 24, 0, 2));
    await waitFor(() => expect(result.current.data).toHaveLength(48));
    expect(zakresy).toEqual([{ od: 0, do: 47, zLicznikiem: true }]);
    expect(result.current).toMatchObject({ page: 1, firstPage: 0, hasMore: true });
    expect(result.current.data[0]).toEqual({ id: "a0" });

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.data).toHaveLength(72));
    expect(zakresy[1]).toEqual({ od: 48, do: 71, zLicznikiem: false });
    expect(result.current.page).toBe(2);
  });

  it("wejście z linku ?page=3 + 'Pokaż więcej', powrót: strony 3-4", async () => {
    const { result } = renderHook(() => useActivitiesInfinite(FILTRY, 24, 2, 2));
    await waitFor(() => expect(result.current.data).toHaveLength(48));
    expect(zakresy).toEqual([{ od: 48, do: 95, zLicznikiem: true }]);
    expect(result.current).toMatchObject({ page: 3, firstPage: 2 });
  });

  it("odbudowa 10 stron idzie kawałkami po 192 wiersze", async () => {
    const { result } = renderHook(() => useActivitiesInfinite(FILTRY, 24, 0, 10));
    await waitFor(() => expect(result.current.data).toHaveLength(240));
    expect(zakresy).toEqual([
      { od: 0, do: 191, zLicznikiem: true },
      { od: 192, do: 239, zLicznikiem: false },
    ]);
  });

  it("zapis sięga za koniec wyników: cofa się na ostatnią realną stronę, od pierwszej", async () => {
    stan.wszystkich = 30;
    const { result } = renderHook(() => useActivitiesInfinite(FILTRY, 24, 0, 5));
    await waitFor(() => expect(result.current.data).toHaveLength(30));
    expect(zakresy).toEqual([{ od: 0, do: 47, zLicznikiem: true }]);
    expect(result.current).toMatchObject({ page: 1, firstPage: 0, hasMore: false });
  });

  it("goToPage(0, 2) przy tej samej ostatniej stronie i tak wczytuje od nowa", async () => {
    const { result } = renderHook(() => useActivitiesInfinite(FILTRY, 24, 1));
    await waitFor(() => expect(result.current.data).toHaveLength(24));

    act(() => result.current.goToPage(0, 2));
    await waitFor(() => expect(result.current.data).toHaveLength(48));
    expect(zakresy.at(-1)).toEqual({ od: 0, do: 47, zLicznikiem: true });
    expect(result.current).toMatchObject({ page: 1, firstPage: 0, loading: false });
  });

  it("zmiana filtrów po odbudowie zaczyna od strony 1", async () => {
    const { result, rerender } = renderHook(
      ({ f }: { f: { region: string; ageMin?: number; ageMax?: number } }) => useActivitiesInfinite(f, 24, 0, 2),
      { initialProps: { f: FILTRY } },
    );
    await waitFor(() => expect(result.current.data).toHaveLength(48));

    rerender({ f: { ...FILTRY, ageMin: 3, ageMax: 5 } });
    await waitFor(() => expect(zakresy.at(-1)).toEqual({ od: 0, do: 23, zLicznikiem: true }));
    await waitFor(() => expect(result.current.data).toHaveLength(24));
    expect(result.current).toMatchObject({ page: 0, firstPage: 0 });
  });
});
