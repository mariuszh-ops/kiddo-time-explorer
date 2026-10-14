import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

/**
 * AN-9-033 / AN-9-038: "Polecane miejsca" na "/".
 * - odczyt padl (5xx) -> error=true (sekcja pokazuje komunikat), retry() czyta ponownie;
 * - zawieszony serwer -> blad po READ_TIMEOUT_MS (10 s), a nie szkielet ~67 s.
 */
const { stan } = vi.hoisted(() => ({
  stan: { tryb: "ok" as "ok" | "blad" | "zawis", zapytan: 0 },
}));

vi.mock("@/lib/catalogClient", () => {
  const wynik = (signal?: AbortSignal) => {
    stan.zapytan += 1;
    if (stan.tryb === "blad") return Promise.resolve({ data: null, error: { message: "500" } });
    if (stan.tryb === "zawis") {
      // postgrest-js po abort() oddaje { error } z AbortError (bez ponowien)
      return new Promise((resolve) => {
        signal?.addEventListener("abort", () =>
          resolve({ data: null, error: { message: "AbortError: The user aborted a request." } }),
        );
      });
    }
    return Promise.resolve({ data: [{ id: "a1" }, { id: "a2" }], error: null });
  };
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit"]) builder[m] = () => builder;
  builder.abortSignal = (signal: AbortSignal) => wynik(signal);
  return {
    CARD_COLUMNS: "*",
    catalogClient: { from: () => builder },
    mapCatalogRow: (r: { id: string }) => ({ id: r.id }),
  };
});

vi.mock("@/hooks/useHomeCounts", () => ({
  useHomeCounts: () => ({ counts: { regions: {}, types: {} } }),
}));

async function zaladujHook() {
  vi.resetModules();
  return (await import("@/hooks/useTopActivities")).useTopActivities;
}

describe("useTopActivities — stan błędu i limit czasu (AN-9-033/038)", () => {
  beforeEach(() => {
    stan.tryb = "ok";
    stan.zapytan = 0;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("5xx: error=true zamiast cichej pustej listy, retry() wczytuje polecane", async () => {
    stan.tryb = "blad";
    const useTopActivities = await zaladujHook();
    const { result } = renderHook(() => useTopActivities(12));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(true);
    expect(result.current.activities).toEqual([]);

    stan.tryb = "ok";
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.activities).toHaveLength(2));
    expect(result.current.error).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(stan.zapytan).toBe(2);
  });

  it("zawieszony serwer: błąd po 10 s, nie wcześniej", async () => {
    vi.useFakeTimers();
    stan.tryb = "zawis";
    const useTopActivities = await zaladujHook();
    const { result } = renderHook(() => useTopActivities(12));

    await act(async () => { await vi.advanceTimersByTimeAsync(9_900); });
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(false);

    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(true);
  });

  it("udany odczyt: bez błędu, limit sztuk respektowany", async () => {
    const useTopActivities = await zaladujHook();
    const { result } = renderHook(() => useTopActivities(1));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(false);
    expect(result.current.activities).toHaveLength(1);
  });
});
