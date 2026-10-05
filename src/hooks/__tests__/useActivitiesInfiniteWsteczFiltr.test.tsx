import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

/**
 * FMN K3 (noc 06.10, FMN-2-072): /mazowieckie -> „Pokaż więcej" (?page=2, 48 kafli)
 * -> filtr wieku -> „wstecz". Wpis historii to dalej ?page=2 z listą od strony 1,
 * a hook zerował stronę przy KAŻDEJ zmianie klucza filtrów: 24 kafle i zapis
 * adresu bez `page`. Strony z wpisu podaje strona (5. argument).
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

import type { UseActivitiesFilters } from "@/hooks/useActivities";
import { useActivitiesInfinite } from "@/hooks/useActivitiesInfinite";

type W = { od: number; ostatnia: number } | null;
const BAZA: UseActivitiesFilters = { region: "mazowieckie" };
const WIEK: UseActivitiesFilters = { ...BAZA, ageMin: 6, ageMax: 9 };

describe("useActivitiesInfinite — „wstecz” zmienia filtry i wraca na ?page=N (FMN K3)", () => {
  beforeEach(() => {
    zakresy.length = 0;
    stan.wszystkich = 300;
    stan.liczenia = 0;
  });

  it("wstecz na wpis po „Pokaż więcej”: 48 kafli od pierwszego, strona 2 zostaje", async () => {
    const { result, rerender } = renderHook(
      ({ f, w }: { f: UseActivitiesFilters; w: W }) => useActivitiesInfinite(f, 24, 0, 1, w),
      { initialProps: { f: BAZA, w: null as W } },
    );
    await waitFor(() => expect(result.current.data).toHaveLength(24));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.data).toHaveLength(48));

    // filtr wieku przez użytkownika (PUSH): od strony 1
    rerender({ f: WIEK, w: null });
    await waitFor(() => expect(zakresy.at(-1)).toEqual({ od: 0, do: 23, zLicznikiem: true }));
    await waitFor(() => expect(result.current.data).toHaveLength(24));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.data).toHaveLength(48));

    // „wstecz” na /mazowieckie?page=2 ze stanem ffListaOd = 0
    rerender({ f: BAZA, w: { od: 0, ostatnia: 1 } });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.data).toHaveLength(48));
    expect(zakresy.at(-1)).toEqual({ od: 0, do: 47, zLicznikiem: true });
    expect(result.current).toMatchObject({ page: 1, firstPage: 0, hasMore: true });
    expect(result.current.data[0]).toEqual({ id: "a0" });
  });

  it("wstecz na wpis z linku ?page=3 (bez ffListaOd): sama strona 3 (K-03)", async () => {
    const { result, rerender } = renderHook(
      ({ f, w }: { f: UseActivitiesFilters; w: W }) => useActivitiesInfinite(f, 24, 0, 1, w),
      { initialProps: { f: WIEK, w: null as W } },
    );
    await waitFor(() => expect(result.current.data).toHaveLength(24));
    rerender({ f: BAZA, w: { od: 2, ostatnia: 2 } });
    await waitFor(() => expect(result.current.data[0]).toEqual({ id: "a48" }));
    expect(result.current.data).toHaveLength(24);
    expect(result.current).toMatchObject({ page: 2, firstPage: 2 });
  });

  it("następna zmiana filtra przez użytkownika znowu startuje od strony 1", async () => {
    const { result, rerender } = renderHook(
      ({ f, w }: { f: UseActivitiesFilters; w: W }) => useActivitiesInfinite(f, 24, 0, 1, w),
      { initialProps: { f: WIEK, w: null as W } },
    );
    await waitFor(() => expect(result.current.data).toHaveLength(24));
    rerender({ f: BAZA, w: { od: 0, ostatnia: 1 } });
    await waitFor(() => expect(result.current.data).toHaveLength(48));
    rerender({ f: WIEK, w: null });
    await waitFor(() => expect(zakresy.at(-1)).toEqual({ od: 0, do: 23, zLicznikiem: true }));
    await waitFor(() => expect(result.current.data).toHaveLength(24));
    expect(result.current).toMatchObject({ page: 0, firstPage: 0 });
  });
});
