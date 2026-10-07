import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCloseOnBack } from "@/hooks/useCloseOnBack";

/**
 * GOLIVE GL-4-004/005 — regresja. Galeria zdjęć otwarta, „wstecz" ma zamknąć
 * galerię i zostawić kartę (wpis-atrapa w historii), a zamknięcie X/Esc ma
 * zdjąć atrapę jednym cofnięciem.
 */
describe("useCloseOnBack — wpis-atrapa dla galerii (GL-4-004/005)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("„wstecz” zamyka okno najświeższym onClose i nie cofa drugi raz", () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => undefined);
    const zamkniecia: number[] = [];
    const { rerender } = renderHook(
      ({ open, n }) => useCloseOnBack(open, () => zamkniecia.push(n)),
      { initialProps: { open: false, n: 0 } },
    );
    expect(window.history.state?.closeOnBackOpen).toBeUndefined();

    rerender({ open: true, n: 1 });
    expect(typeof window.history.state?.closeOnBackOpen).toBe("string");
    rerender({ open: true, n: 2 });

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: { idx: 0 } }));
    });
    expect(zamkniecia).toEqual([2]);

    // Rodzic zamyka okno po onClose — atrapa już zdjęta przez „wstecz".
    rerender({ open: false, n: 3 });
    expect(back).not.toHaveBeenCalled();
  });

  it("zamknięcie X/Esc zdejmuje atrapę jednym history.back()", () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => undefined);
    const onClose = vi.fn();
    const { rerender } = renderHook(({ open }) => useCloseOnBack(open, onClose), {
      initialProps: { open: true },
    });
    expect(typeof window.history.state?.closeOnBackOpen).toBe("string");

    rerender({ open: false });
    expect(back).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});
