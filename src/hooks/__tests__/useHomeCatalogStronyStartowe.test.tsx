import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { Filters } from "@/hooks/useActivityFilters";

/**
 * FMN-B03: po "wstecz" z karty lista ma wrocic z tyloma porcjami, ile miala.
 * Sprawdzamy ksztalt zapytan do ff_home_list: pierwsze wczytuje od razu
 * wszystkie przywracane porcje, "Pokaz wiecej" dokleja kolejna, a zmiana
 * filtrow zaczyna od jednej porcji.
 */
const { wywolania, WSZYSTKICH } = vi.hoisted(() => ({
  wywolania: [] as { p_limit: number; p_offset: number }[],
  WSZYSTKICH: 300,
}));

vi.mock("@/lib/catalogClient", () => ({
  CARD_COLUMNS: "*",
  mapCatalogRow: (r: { id: string }) => ({ id: r.id }),
  catalogClient: {
    rpc: (nazwa: string, args: { p_limit: number; p_offset: number }) => {
      let wynik: { data: unknown; error: null };
      if (nazwa === "ff_home_list") {
        wywolania.push({ p_limit: args.p_limit, p_offset: args.p_offset });
        const ile = Math.max(0, Math.min(args.p_limit, WSZYSTKICH - args.p_offset));
        wynik = { data: Array.from({ length: ile }, (_, i) => ({ id: `a${args.p_offset + i}` })), error: null };
      } else {
        wynik = { data: { region: {}, type: {}, age: {}, filtered: WSZYSTKICH, total: WSZYSTKICH }, error: null };
      }
      const p = Promise.resolve(wynik);
      return { select: () => p, then: p.then.bind(p) };
    },
  },
}));

import { useHomeCatalog } from "@/hooks/useHomeCatalog";

const FILTRY: Filters = { age: "6-9" };

describe("useHomeCatalog — strony startowe (powrot z karty)", () => {
  beforeEach(() => {
    wywolania.length = 0;
  });

  it("zwykle wejscie: jedna porcja 24", async () => {
    const { result } = renderHook(() => useHomeCatalog(FILTRY, "", true, true));
    await waitFor(() => expect(result.current.activities).toHaveLength(24));
    expect(wywolania).toEqual([{ p_limit: 24, p_offset: 0 }]);
    expect(result.current.strony).toBe(1);
  });

  it("powrot z 2 porcjami: jedno zapytanie o 48, potem 'Pokaz wiecej' od 48", async () => {
    const { result } = renderHook(() => useHomeCatalog(FILTRY, "", true, true, 2));
    await waitFor(() => expect(result.current.activities).toHaveLength(48));
    expect(wywolania).toEqual([{ p_limit: 48, p_offset: 0 }]);
    expect(result.current.strony).toBe(2);

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.activities).toHaveLength(72));
    expect(wywolania[1]).toEqual({ p_limit: 24, p_offset: 48 });
    expect(result.current.strony).toBe(3);
  });

  it("powrot z 10 porcjami: kawalki po 192 (limit serwera 200)", async () => {
    const { result } = renderHook(() => useHomeCatalog(FILTRY, "", true, true, 10));
    await waitFor(() => expect(result.current.activities).toHaveLength(240));
    expect(wywolania).toEqual([
      { p_limit: 192, p_offset: 0 },
      { p_limit: 48, p_offset: 192 },
    ]);
  });

  it("zmiana filtrow po powrocie zaczyna od jednej porcji", async () => {
    const { result, rerender } = renderHook(
      ({ f }: { f: Filters }) => useHomeCatalog(f, "", true, true, 2),
      { initialProps: { f: FILTRY } },
    );
    await waitFor(() => expect(result.current.activities).toHaveLength(48));

    rerender({ f: { age: "3-5" } });
    await waitFor(() => expect(wywolania.at(-1)).toEqual({ p_limit: 24, p_offset: 0 }));
    await waitFor(() => expect(result.current.activities).toHaveLength(24));
    expect(result.current.strony).toBe(1);
  });
});
