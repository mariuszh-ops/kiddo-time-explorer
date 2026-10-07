import { describe, it, expect, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useShare } from "@/hooks/useShare";

/**
 * GOLIVE GL-4-024 — regresja. Bez Web Share i z odmową schowka hook ma zwrócić
 * 'failed' (wywołujący pokazuje komunikat), a nie `false`, które oznacza
 * anulowanie arkusza udostępniania przez użytkownika (wtedy cisza).
 */
const data = { title: "T", text: "X", url: "https://familyfun.pl/atrakcje/abc" };
const original = { share: navigator.share, clipboard: navigator.clipboard };

function ustaw(share: unknown, clipboard: unknown) {
  Object.defineProperty(navigator, "share", { configurable: true, value: share });
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: clipboard });
}

afterEach(() => ustaw(original.share, original.clipboard));

describe("useShare — schowek odmawia (GL-4-024)", () => {
  it("bez Web Share i z odmową schowka zwraca 'failed'", async () => {
    ustaw(undefined, {
      writeText: async () => {
        throw new DOMException("brak zgody", "NotAllowedError");
      },
    });
    const { result } = renderHook(() => useShare());
    await expect(result.current.share(data)).resolves.toBe("failed");
  });

  it("bez Web Share i z działającym schowkiem zwraca 'clipboard'", async () => {
    const zapisane: string[] = [];
    ustaw(undefined, { writeText: async (t: string) => void zapisane.push(t) });
    const { result } = renderHook(() => useShare());
    await expect(result.current.share(data)).resolves.toBe("clipboard");
    expect(zapisane).toEqual([data.url]);
  });

  it("anulowanie Web Share (AbortError) zwraca false i nie dotyka schowka", async () => {
    const zapisane: string[] = [];
    ustaw(
      async () => {
        throw new DOMException("anulowano", "AbortError");
      },
      { writeText: async (t: string) => void zapisane.push(t) },
    );
    const { result } = renderHook(() => useShare());
    await expect(result.current.share(data)).resolves.toBe(false);
    expect(zapisane).toEqual([]);
  });
});
