import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { filterOptions, setActivities, type Activity } from "@/data/activities";
import BreadcrumbCityDropdown from "@/components/BreadcrumbCityDropdown";
import BreadcrumbCategoryDropdown from "@/components/BreadcrumbCategoryDropdown";

/**
 * AF-1-081: liczniki w rozwijanych listach breadcrumbu /{region}/{kategoria}
 * pokazywaly "(0)" przy kazdym wojewodztwie. Katalog dociaga sie asynchronicznie
 * PO otwarciu menu, a liczniki byly liczone tylko przy zmianie `open`.
 * Po zaladowaniu katalogu menu ma sie przeliczyc; przed zaladowaniem nie pokazuje "(0)".
 */
vi.mock("@/data/activities", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/data/activities")>();
  // bez sieci: katalog "laduje" test przez setActivities()
  return { ...actual, ensureActivitiesLoaded: vi.fn() };
});

const typ0 = filterOptions.type[0];
const typ1 = filterOptions.type[1];

const katalog = [
  { id: 1, city: "mazowieckie", type: typ0.value, isEvent: false },
  { id: 2, city: "mazowieckie", type: typ0.value, isEvent: false },
  { id: 3, city: "mazowieckie", type: typ1.value, isEvent: false },
  { id: 4, city: "malopolskie", type: typ0.value, isEvent: false },
] as unknown as Activity[];

afterEach(() => cleanup());

const wierszLicznik = (etykieta: string) => {
  const link = screen.getByText(etykieta, { exact: true }).closest("a");
  return link?.textContent?.replace(etykieta, "").trim() ?? null;
};

describe("BreadcrumbCityDropdown — liczniki po dociagnieciu katalogu (AF-1-081)", () => {
  it("przed zaladowaniem nie pokazuje (0), po zaladowaniu pokazuje liczby", () => {
    render(
      <MemoryRouter>
        <BreadcrumbCityDropdown currentCitySlug="mazowieckie" />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Mazowieckie/ }));

    // katalog jeszcze nie przyszedl: zadnych falszywych zer
    expect(wierszLicznik("Małopolskie")).toBe("");
    expect(screen.queryByText("(0)")).toBeNull();

    act(() => setActivities(katalog));

    expect(wierszLicznik("Małopolskie")).toBe("(1)");
    const linki = screen.getAllByRole("link");
    const maz = linki.find((a) => a.getAttribute("href") === "/atrakcje/mazowieckie");
    expect(maz?.textContent).toContain("(3)");
  });
});

describe("BreadcrumbCategoryDropdown — liczniki po dociagnieciu katalogu (AF-1-081)", () => {
  it("po zaladowaniu przelicza Wszystkie i kategorie biezacego wojewodztwa", () => {
    render(
      <MemoryRouter>
        <BreadcrumbCategoryDropdown citySlug="mazowieckie" activeCategorySlug={typ0.value} currentLabel={typ0.label} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: new RegExp(typ0.label) }));

    act(() => setActivities(katalog));

    expect(wierszLicznik("Wszystkie")).toBe("(3)");
    const linki = screen.getAllByRole("link");
    const k0 = linki.find((a) => a.getAttribute("href") === `/atrakcje/mazowieckie/${typ0.value}`);
    const k1 = linki.find((a) => a.getAttribute("href") === `/atrakcje/mazowieckie/${typ1.value}`);
    expect(k0?.textContent).toContain("(2)");
    expect(k1?.textContent).toContain("(1)");
  });
});
