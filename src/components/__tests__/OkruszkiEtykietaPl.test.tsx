import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList } from "@/components/ui/breadcrumb";
import { pluralPl } from "@/lib/plural";

/**
 * AN-12-002: okruszki mialy aria-label="breadcrumb" (czytnik czytal angielskie slowo).
 * Domyslna etykieta komponentu to „Ścieżka” (jak /indeks/*), a wywolujacy moze ja nadpisac.
 * AN-12-016: liczniki panelu admina odmieniaja sie przez pluralPl (1 / 2–4 / 5+).
 */
afterEach(cleanup);

describe("AN-12-002: okruszki po polsku", () => {
  it("domyslny aria-label = Ścieżka", () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>Strona główna</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(screen.getByRole("navigation", { name: "Ścieżka" })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "breadcrumb" })).toBeNull();
  });

  it("aria-label przekazany z zewnatrz wygrywa", () => {
    render(<Breadcrumb aria-label="Nawigacja okruszkowa" />);
    expect(screen.getByRole("navigation", { name: "Nawigacja okruszkowa" })).toBeTruthy();
  });
});

describe("AN-12-016: odmiana licznikow panelu admina", () => {
  const przypadki: Array<[number, string, string, string]> = [
    [1, "zgłoszenie", "propozycja", "opinia"],
    [2, "zgłoszenia", "propozycje", "opinie"],
    [4, "zgłoszenia", "propozycje", "opinie"],
    [5, "zgłoszeń", "propozycji", "opinii"],
    [12, "zgłoszeń", "propozycji", "opinii"],
    [22, "zgłoszenia", "propozycje", "opinie"],
    [0, "zgłoszeń", "propozycji", "opinii"],
  ];
  it.each(przypadki)("%i -> %s / %s / %s", (n, zgl, prop, opi) => {
    expect(pluralPl(n, "zgłoszenie", "zgłoszenia", "zgłoszeń")).toBe(zgl);
    expect(pluralPl(n, "propozycja", "propozycje", "propozycji")).toBe(prop);
    expect(pluralPl(n, "opinia", "opinie", "opinii")).toBe(opi);
  });
});
