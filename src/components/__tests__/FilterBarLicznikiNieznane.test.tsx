import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FilterBar from "@/components/FilterBar";
import MobileFilterSheet from "@/components/MobileFilterSheet";
import type { HomeFilterCounts } from "@/hooks/useHomeCatalog";

/**
 * FMN-B07: pasek filtrow przy licznikach nieznanych (null) nie moze twierdzic
 * "Zadna atrakcja nie spelnia wybranych filtrow" ani pokazywac "(0)" przy
 * opcjach. Realne zero dalej daje komunikat.
 */
const PUSTKA = "Żadna atrakcja nie spełnia wybranych filtrów";

const liczniki = (n: number | null): HomeFilterCounts => ({
  city: [
    { value: "mazowieckie", label: "Mazowieckie", count: n },
    { value: "slaskie", label: "Śląskie", count: n },
  ],
  age: [{ value: "3-5", label: "3–5 lat", count: n }],
  type: [
    { value: "zoo", label: "Zoo", count: n },
    { value: "park", label: "Park", count: n },
  ],
  indoor: [],
  activityKind: [],
  distance: [],
  price: [],
  total: n,
  filtered: n,
  hasAnyFilter: true,
});

const noop = () => {};

const renderBar = (n: number | null) =>
  render(
    <MemoryRouter>
      <FilterBar
        filters={{ age: "3-5" }}
        searchQuery=""
        onSearchChange={noop}
        filterCounts={liczniki(n)}
        onUpdateFilter={noop}
        onToggleTypeFilter={noop}
        onClearAll={noop}
        hideSearch
      />
    </MemoryRouter>,
  );

const tekstStatusu = () => screen.getAllByRole("status").map((s) => s.textContent?.trim() ?? "").join(" | ");

describe("FilterBar — liczniki nieznane (FMN-B07)", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
  });

  it("null: bez komunikatu pustki i bez '(0)' przy kategoriach", () => {
    renderBar(null);
    expect(tekstStatusu()).not.toContain(PUSTKA);
    expect(tekstStatusu()).toBe("");

    fireEvent.click(screen.getByRole("button", { name: /Kategoria/ }));
    const zoo = screen.getByRole("option", { name: /Zoo/ });
    expect(zoo.textContent).toBe("Zoo");
    expect(document.body.textContent).not.toMatch(/\(0\)|\(null\)/);
  });

  it("null: regiony klikalne, bez '(wkrótce)'", () => {
    renderBar(null);
    fireEvent.click(screen.getByRole("button", { name: /Województwo/ }));
    const region = screen.getByRole("option", { name: /Mazowieckie/ });
    expect(region.getAttribute("aria-disabled")).toBeNull();
    expect(document.body.textContent).not.toContain("wkrótce");
  });

  it("realne zero: komunikat pustki zostaje", () => {
    renderBar(0);
    expect(tekstStatusu()).toContain(PUSTKA);
  });

  it("liczby przyszly: status i opcje z liczbami", () => {
    renderBar(297);
    expect(tekstStatusu()).toContain("297 atrakcji pasuje do wybranych filtrów");
    fireEvent.click(screen.getByRole("button", { name: /Kategoria/ }));
    expect(screen.getByRole("option", { name: /Zoo/ }).textContent).toBe("Zoo(297)");
  });
});

describe("MobileFilterSheet — liczniki nieznane (FMN-B07)", () => {
  const renderSheet = (n: number | null) =>
    render(
      <MemoryRouter>
        <MobileFilterSheet
          isOpen
          onClose={noop}
          filters={{ age: "3-5" }}
          searchQuery=""
          onSearchChange={noop}
          filterCounts={liczniki(n)}
          onUpdateFilter={noop}
          onToggleTypeFilter={noop}
          onClearAll={noop}
        />
      </MemoryRouter>,
    );

  it("null: pola bez liczby, 'Pokaż wyniki' bez '(0)'", () => {
    renderSheet(null);
    expect(screen.getByRole("checkbox", { name: "Zoo" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pokaż wyniki" })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\(0\)|\(null\)/);
  });

  it("liczby przyszly: pola i przycisk z liczbami", () => {
    renderSheet(12);
    expect(screen.getByRole("checkbox", { name: "Zoo (12)" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pokaż wyniki (12)" })).toBeTruthy();
  });
});
