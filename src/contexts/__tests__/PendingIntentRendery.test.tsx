import { memo } from "react";
import { describe, it, expect } from "vitest";
import { render, act } from "@testing-library/react";
import {
  PendingIntentProvider,
  usePendingIntent,
  usePendingIntentValue,
  type PendingIntent,
} from "@/contexts/PendingIntentContext";

/**
 * INP (A1000-P, serce jako gość): `setPendingIntent` NIE może renderować
 * konsumentów, którzy biorą tylko akcje (karty na liście, ich modale).
 * Przy jednym kontekście z `value={{...}}` każda z 24 kart renderowała się
 * przy kliknięciu serca mimo `React.memo`.
 */
describe("PendingIntentContext — akcje nie renderują konsumentów", () => {
  it("zmiana intencji renderuje tylko czytelnika stanu, nie konsumenta akcji", () => {
    const rendery = { karta: 0, runner: 0 };
    let ustaw: (i: PendingIntent) => void = () => undefined;
    let wyczysc: () => void = () => undefined;
    let widziana: PendingIntent | null = null;

    const Karta = memo(() => {
      rendery.karta += 1;
      const { setPendingIntent, clearPendingIntent } = usePendingIntent();
      ustaw = setPendingIntent;
      wyczysc = clearPendingIntent;
      return null;
    });
    const Runner = memo(() => {
      rendery.runner += 1;
      widziana = usePendingIntentValue();
      return null;
    });

    sessionStorage.clear();
    render(
      <PendingIntentProvider>
        <Karta />
        <Runner />
      </PendingIntentProvider>,
    );
    expect(rendery).toEqual({ karta: 1, runner: 1 });

    act(() => ustaw({ kind: "favorite", activityId: 7, slug: "x" }));
    expect(widziana).toEqual({ kind: "favorite", activityId: 7, slug: "x" });
    expect(rendery.runner).toBe(2);
    expect(rendery.karta).toBe(1);

    act(() => wyczysc());
    expect(widziana).toBeNull();
    expect(rendery.karta).toBe(1);
  });
});
