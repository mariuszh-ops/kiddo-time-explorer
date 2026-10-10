import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BrowserRouter, useLocation } from "react-router-dom";
import HeaderSearch from "@/components/HeaderSearch";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

/**
 * FMN-B54 (R2 = A): wyszukiwarka w nagłówku karty atrakcji otwartej z kafla
 * listy szuka z wiekiem i województwem tej listy (stan wpisu historii
 * `ffZListy`). Zmierzone 26.09: z karty Enter dawał /?search=park bez niczego.
 */

const Adres = () => {
  const location = useLocation();
  return <output data-testid="adres">{location.pathname + location.search}</output>;
};

const wejdz = (url: string, usr?: unknown) => {
  window.history.replaceState(usr === undefined ? null : { usr, key: "karta", idx: 0 }, "", url);
  render(
    <BrowserRouter>
      <Adres />
      <HeaderSearch />
    </BrowserRouter>,
  );
};

const adres = () => screen.getByTestId("adres").textContent;
const pole = () => screen.getByRole("searchbox");
const szukaj = (fraza: string) => {
  fireEvent.change(pole(), { target: { value: fraza } });
  fireEvent.submit(pole().closest("form")!);
};
const Z_LISTY = { ffZListy: "/?region=malopolskie&age=3-5&type=zoo&sort=rating" };

describe("HeaderSearch na karcie atrakcji (FMN-B54)", () => {
  beforeEach(() => cleanup());

  it("karta z kafla listy: Enter = „/” z frazą, wiekiem i województwem listy", () => {
    wejdz("/atrakcje/zoo-krakow", Z_LISTY);
    szukaj("park");
    expect(adres()).toBe("/?region=malopolskie&age=3-5&search=park");
  });

  it("karta bez stanu (link, Google, ctrl+klik): jak dotąd /?search=", () => {
    wejdz("/atrakcje/zoo-krakow");
    szukaj("park linowy");
    expect(adres()).toBe("/?search=park%20linowy");
  });

  it("„Wyczyść” na karcie nie nawiguje, więc stan z filtrami listy zostaje", () => {
    wejdz("/atrakcje/zoo-krakow", Z_LISTY);
    const przed = window.history.state;
    fireEvent.change(pole(), { target: { value: "par" } });
    fireEvent.click(screen.getByRole("button", { name: "Wyczyść wyszukiwanie" }));
    expect(adres()).toBe("/atrakcje/zoo-krakow");
    expect(window.history.state).toBe(przed);
    expect(window.history.state.usr).toEqual(Z_LISTY);
  });

  it("strona województwa: „Wyczyść” dalej zdejmuje samą frazę (bez zmian)", () => {
    wejdz("/mazowieckie?age=3-5&search=zoo");
    fireEvent.click(screen.getByRole("button", { name: "Wyczyść wyszukiwanie" }));
    expect(adres()).toBe("/mazowieckie?age=3-5");
  });
});
