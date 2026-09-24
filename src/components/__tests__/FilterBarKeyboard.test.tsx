import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FilterBar from "@/components/FilterBar";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import type { Filters } from "@/hooks/useActivityFilters";

/**
 * FMN-B09: klawiatura w pasku filtrow.
 * (1) Enter tuz po wpisaniu frazy przepadal, bo obsluga Entera stala za bramka
 *     `showDropdown`, a ta dogania pole dopiero po 150 ms debounce.
 * (2) Po „Wyczyść filtry” fokus spadal na <body>, bo przycisk znika razem z filtrami.
 */

vi.mock("@/hooks/useActivitySuggestions", () => ({
  useActivitySuggestions: () => [],
}));

const POLE = "Szukaj atrakcji, miasta lub kategorii";

const pusteLiczniki = {
  city: [],
  age: [{ value: "3-5", label: "3–5 lat", count: 10 }],
  type: [],
  indoor: [],
  activityKind: [],
  distance: [],
  price: [],
  total: 100,
  filtered: 10,
  hasAnyFilter: true,
};

describe("FMN-B09: Enter w SearchAutocomplete", () => {
  it("zatwierdza fraze wpisana przed koncem debounce", () => {
    vi.useFakeTimers();
    const onSearchChange = vi.fn();
    render(
      <MemoryRouter>
        <SearchAutocomplete searchQuery="" onSearchChange={onSearchChange} />
      </MemoryRouter>,
    );
    const pole = screen.getByRole("combobox", { name: POLE });
    fireEvent.focus(pole);
    fireEvent.change(pole, { target: { value: "zoo" } });
    // Bez vi.advanceTimersByTime: lista podpowiedzi jeszcze sie nie pokazala.
    fireEvent.keyDown(pole, { key: "Enter" });
    expect(onSearchChange).toHaveBeenLastCalledWith("zoo");
    vi.useRealTimers();
  });

  it("po Escape Enter zatwierdza fraze zamiast niewidocznej podpowiedzi", () => {
    const onSearchChange = vi.fn();
    render(
      <MemoryRouter>
        <SearchAutocomplete searchQuery="" onSearchChange={onSearchChange} />
      </MemoryRouter>,
    );
    const pole = screen.getByRole("combobox", { name: POLE });
    fireEvent.change(pole, { target: { value: "żółw" } });
    fireEvent.keyDown(pole, { key: "Escape" });
    fireEvent.keyDown(pole, { key: "Enter" });
    expect(onSearchChange).toHaveBeenLastCalledWith("żółw");
  });
});

describe("FMN-B09: fokus po „Wyczyść filtry”", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
  });

  const Pasek = () => {
    const [filters, setFilters] = useState<Filters>({ age: "3-5" });
    return (
      <MemoryRouter>
        <FilterBar
          filters={filters}
          searchQuery=""
          onSearchChange={() => {}}
          filterCounts={{ ...pusteLiczniki, hasAnyFilter: Boolean(filters.age) }}
          onUpdateFilter={() => {}}
          onToggleTypeFilter={() => {}}
          onClearAll={() => setFilters({})}
        />
      </MemoryRouter>
    );
  };

  it("przenosi fokus na pierwszy trigger filtra, nie na <body>", () => {
    render(<Pasek />);
    const wyczysc = screen.getByRole("button", { name: /Wyczyść filtry/ });
    wyczysc.focus();
    fireEvent.click(wyczysc);

    expect(screen.queryByRole("button", { name: /Wyczyść filtry/ })).toBeNull();
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement?.tagName).toBe("BUTTON");
    expect(document.activeElement?.isConnected).toBe(true);
  });
});
