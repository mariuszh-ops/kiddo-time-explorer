import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import HomeSearch from "@/components/HomeSearch";

vi.mock("@/hooks/useActivitySuggestions", () => ({
  useActivitySuggestions: (query: string) =>
    query.trim().length >= 2
      ? [
          { id: 1, slug: "zoo-krakow", title: "Ogród Zoologiczny w Krakowie", city: "malopolskie", type: "zoo" },
          { id: 2, slug: "nieznany", title: "Miejsce spoza listy", city: "region-spoza-listy", type: "zoo" },
        ]
      : [],
}));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

/**
 * AN-12-073: podpowiedź na „/” pokazywała surowy slug regionu
 * („malopolskie · Zoo i zwierzęta”). Ma być polska etykieta województwa,
 * tak jak w SearchAutocomplete (getRegionLabel).
 */
describe("HomeSearch — region w podpowiedzi (AN-12-073)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.replaceState(null, "", "/");
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const podpowiedzi = () => {
    render(
      <BrowserRouter>
        <HomeSearch />
      </BrowserRouter>,
    );
    const pole = screen.getByRole("combobox");
    fireEvent.focus(pole);
    fireEvent.change(pole, { target: { value: "Kraków" } });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    return screen.getAllByRole("option").map((o) => o.textContent ?? "");
  };

  it("pokazuje „Małopolskie”, nie slug „malopolskie”", () => {
    const opcje = podpowiedzi();
    const zoo = opcje.find((t) => t.includes("Ogród Zoologiczny"));
    expect(zoo).toBeDefined();
    expect(zoo).toContain("Małopolskie ·");
    expect(zoo).not.toMatch(/\bmalopolskie\b/);
  });

  it("nieznany slug zostaje bez zmian (fallback jak w SearchAutocomplete)", () => {
    const opcje = podpowiedzi();
    expect(opcje.find((t) => t.includes("Miejsce spoza listy"))).toContain("region-spoza-listy ·");
  });
});
