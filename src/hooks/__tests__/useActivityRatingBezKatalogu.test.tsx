import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

/**
 * Wiersz 21 (03.10): karta atrakcji otwarta z linku albo z mapy w małym kadrze
 * pobierała cały katalog (5 stron public_activities, ok. 520 KB po sieci), bo
 * agregat ocen rodziców tłumaczył activityId -> slug przez pełny katalog.
 * Karta zna slug, więc agregat ma iść prosto do RPC, bez loadActivities().
 */
const { stan } = vi.hoisted(() => ({
  stan: {
    loadActivities: 0,
    rpc: [] as Array<{ fn: string; args: Record<string, unknown> }>,
    slugZKatalogu: undefined as string | undefined,
  },
}));

vi.mock("@/lib/catalogClient", () => ({
  catalogClient: {
    rpc: (fn: string, args: Record<string, unknown>) => {
      stan.rpc.push({ fn, args });
      return Promise.resolve({ data: [{ avg_rating: 4.5, ratings_count: 7 }], error: null });
    },
  },
}));

vi.mock("@/data/activities", () => ({
  slugFromId: () => stan.slugZKatalogu,
  loadActivities: () => {
    stan.loadActivities += 1;
    stan.slugZKatalogu = "z-katalogu";
    return Promise.resolve([]);
  },
}));

import { useActivityRating } from "@/hooks/useActivityRating";

describe("useActivityRating: znany slug bez katalogu (wiersz 21)", () => {
  beforeEach(() => {
    stan.loadActivities = 0;
    stan.rpc = [];
    stan.slugZKatalogu = undefined;
  });

  it("ze slugiem karty: RPC po tym slugu, katalog nie jest pobierany", async () => {
    const { result } = renderHook(() => useActivityRating(101, "k1", "tepfactor-warszawa"));
    await waitFor(() => expect(result.current.count).toBe(7));
    expect(result.current.avg).toBe(4.5);
    expect(stan.loadActivities).toBe(0);
    expect(stan.rpc).toEqual([
      { fn: "get_activity_rating_by_slug", args: { p_slug: "tepfactor-warszawa" } },
    ]);
  });

  it("bez sluga i bez katalogu: dawna ścieżka (katalog, potem RPC) zostaje", async () => {
    const { result } = renderHook(() => useActivityRating(202, "k1"));
    await waitFor(() => expect(result.current.count).toBe(7));
    expect(stan.loadActivities).toBe(1);
    expect(stan.rpc).toEqual([
      { fn: "get_activity_rating_by_slug", args: { p_slug: "z-katalogu" } },
    ]);
  });

  it("activityId 0 (karta jeszcze bez rekordu): bez zapytań", async () => {
    renderHook(() => useActivityRating(0, "k1", undefined));
    await new Promise((r) => setTimeout(r, 20));
    expect(stan.loadActivities).toBe(0);
    expect(stan.rpc).toEqual([]);
  });
});
