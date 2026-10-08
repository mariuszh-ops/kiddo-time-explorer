import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MobileFilterSheet from "@/components/MobileFilterSheet";
import type { HomeFilterCounts } from "@/hooks/useHomeCatalog";
import type { Filters } from "@/hooks/useActivityFilters";

/**
 * AF-6-060 (WCAG 4.1.2): przyciski sortowania w arkuszu filtrów pokazywały
 * wybór tylko kolorem. Mają być grupą przełączników z aria-pressed:
 * dokładnie jeden "true", stan idzie za filters.sort.
 */
const SORT = [
  "Najlepiej oceniane",
  "Najwięcej ocen",
  "Najlepiej oceniane (Google)",
  "Najpopularniejsze (Google)",
  "Najbliżej centrum",
  "Nazwa A–Z",
];

const liczniki: HomeFilterCounts = {
  city: [{ value: "mazowieckie", label: "Mazowieckie", count: 3 }],
  age: [{ value: "3-5", label: "3–5 lat", count: 3 }],
  type: [{ value: "zoo", label: "Zoo", count: 3 }],
  indoor: [],
  activityKind: [],
  distance: [],
  price: [],
  total: 3,
  filtered: 3,
  hasAnyFilter: false,
};

const noop = () => {};

const renderSheet = (filters: Filters, onUpdateFilter = vi.fn()) => {
  render(
    <MemoryRouter>
      <MobileFilterSheet
        isOpen
        onClose={noop}
        filters={filters}
        searchQuery=""
        onSearchChange={noop}
        filterCounts={liczniki}
        onUpdateFilter={onUpdateFilter}
        onToggleTypeFilter={noop}
        onClearAll={noop}
      />
    </MemoryRouter>,
  );
  return onUpdateFilter;
};

const stany = () => {
  const grupa = screen.getByRole("group", { name: "Sortowanie" });
  return SORT.map((nazwa) => within(grupa).getByRole("button", { name: nazwa }).getAttribute("aria-pressed"));
};

describe("MobileFilterSheet — stan sortowania dla czytnika (AF-6-060)", () => {
  it("bez sort w adresie: 6 przełączników w grupie 'Sortowanie', wciśnięty tylko 'Najlepiej oceniane'", () => {
    renderSheet({});
    expect(stany()).toEqual(["true", "false", "false", "false", "false", "false"]);
  });

  it("sort=name: wciśnięty tylko 'Nazwa A–Z'", () => {
    renderSheet({ sort: "name" } as Filters);
    expect(stany()).toEqual(["false", "false", "false", "false", "false", "true"]);
  });

  it("klik w przełącznik zapisuje sort (zachowanie bez zmian)", () => {
    const onUpdateFilter = renderSheet({});
    fireEvent.click(screen.getByRole("button", { name: "Najwięcej ocen" }));
    expect(onUpdateFilter).toHaveBeenCalledTimes(1);
    expect(onUpdateFilter.mock.calls[0][0]).toBe("sort");
    expect(onUpdateFilter.mock.calls[0][1]).toBe("most_reviewed");
  });
});
