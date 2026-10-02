import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BrowserRouter, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { bottomNavMapTarget } from "@/lib/bottomNavMapTarget";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ isLoggedIn: false }) }));

/**
 * FMN-B53 (P1): „Mapa” w dolnej nawigacji na „/” gubiła filtry — stały adres
 * /?view=map. Zmierzone 26.09 (FMN-S krok 5, 390x844): /?age=3-5&type=zoo →
 * dolna „Mapa” → /?view=map&lat=…, wiek i kategoria zniknęły. FMN-7-025: drugi
 * tap na otwartej mapie dokładał wpis historii.
 */

const Adres = () => {
  const location = useLocation();
  return <output data-testid="adres">{location.pathname + location.search}</output>;
};

const wejdz = (url: string) => {
  window.history.replaceState(null, "", url);
  render(
    <BrowserRouter>
      <Adres />
      <BottomNav />
    </BrowserRouter>,
  );
};

const adres = () => screen.getByTestId("adres").textContent;
const mapa = () => fireEvent.click(screen.getByRole("button", { name: "Mapa" }));

describe("BottomNav — „Mapa” zachowuje filtry strony głównej (FMN-B53)", () => {
  beforeEach(() => cleanup());

  it("/?age=3-5&type=zoo → dolna „Mapa” = te same filtry + view=map, jeden wpis historii", () => {
    wejdz("/?age=3-5&type=zoo&search=zoo");
    const przed = window.history.length;
    mapa();
    expect(adres()).toBe("/?age=3-5&type=zoo&search=zoo&view=map");
    expect(window.history.length).toBe(przed + 1);
  });

  it("drugi tap na otwartej mapie nie dokłada wpisu i nie zmienia adresu (FMN-7-025)", () => {
    wejdz("/?age=3-5&view=map&lat=52.22990&lng=21.01204&zoom=11");
    const przed = window.history.length;
    mapa();
    expect(adres()).toBe("/?age=3-5&view=map&lat=52.22990&lng=21.01204&zoom=11");
    expect(window.history.length).toBe(przed);
  });

  it("poza „/” (karta, strona województwa) zostaje /?view=map", () => {
    wejdz("/atrakcje/zoo-warszawa?x=1");
    mapa();
    expect(adres()).toBe("/?view=map");
  });
});

describe("bottomNavMapTarget", () => {
  it("„/” bez filtrów = /?view=map", () => {
    expect(bottomNavMapTarget("/", "")).toBe("/?view=map");
  });
  it("strona województwa = decyzja R2, bez zmian", () => {
    expect(bottomNavMapTarget("/mazowieckie", "?age=6-9&type=zoo")).toBe("/?view=map");
  });
  it("„/” z otwartą mapą = null", () => {
    expect(bottomNavMapTarget("/", "?view=map")).toBeNull();
  });
});
