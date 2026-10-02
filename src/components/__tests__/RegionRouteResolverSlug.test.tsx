import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import RegionRouteResolver from "@/components/RegionRouteResolver";

/**
 * FMN-B83: /śląskie (w pasku adresu jako /%C5%9Bl%C4%85skie) kończyło się 404,
 * choć /SLASKIE działało. Resolver przekierowuje na /slaskie z query i hashem.
 */
vi.mock("@/pages/CategoryPage", () => ({ default: () => <div>STRONA_WOJEWODZTWA</div> }));
vi.mock("@/pages/NotFound", () => ({ default: () => <div>NIE_ZNALEZIONO</div> }));

const Adres = () => {
  const l = useLocation();
  return <div data-testid="adres">{l.pathname + l.search + l.hash}</div>;
};

const renderuj = (wejscie: string) =>
  render(
    <MemoryRouter initialEntries={[wejscie]}>
      <Routes>
        <Route path="/:regionSlug" element={<><RegionRouteResolver /><Adres /></>} />
        <Route path="/:regionSlug/:categorySlug" element={<><RegionRouteResolver /><Adres /></>} />
      </Routes>
    </MemoryRouter>,
  );

describe("RegionRouteResolver — adres z polskimi znakami i wielkimi literami", () => {
  it("/%C5%9Bl%C4%85skie?age=3-5#top → /slaskie?age=3-5#top, strona województwa", async () => {
    renderuj("/%C5%9Bl%C4%85skie?age=3-5#top");
    expect(await screen.findByText("STRONA_WOJEWODZTWA")).toBeTruthy();
    expect(screen.getByTestId("adres").textContent).toBe("/slaskie?age=3-5#top");
  });

  it("/SLASKIE/ZOO → /slaskie/zoo", async () => {
    renderuj("/SLASKIE/ZOO");
    expect(await screen.findByText("STRONA_WOJEWODZTWA")).toBeTruthy();
    expect(screen.getByTestId("adres").textContent).toBe("/slaskie/zoo");
  });

  it("/Krak%C3%B3w → /malopolskie (stare miasto po złożeniu)", async () => {
    renderuj("/Krak%C3%B3w");
    expect(await screen.findByText("STRONA_WOJEWODZTWA")).toBeTruthy();
    expect(screen.getByTestId("adres").textContent).toBe("/malopolskie");
  });

  it("nieznany region po złożeniu dalej 404, bez przekierowania", async () => {
    renderuj("/%C5%BAle");
    expect(await screen.findByText("NIE_ZNALEZIONO")).toBeTruthy();
    expect(screen.getByTestId("adres").textContent).toBe("/%C5%BAle");
  });
});
