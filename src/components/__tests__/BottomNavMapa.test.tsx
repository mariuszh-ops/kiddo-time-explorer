import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BrowserRouter, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { bottomNavMapTarget } from "@/lib/bottomNavMapTarget";
import { bottomNavDiscoverTarget } from "@/lib/bottomNavDiscoverTarget";

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

/**
 * Wiersz 22 (03.10): „Odkrywaj” na czystym „/” dokładał przy każdym tapie
 * wpis z tym samym adresem (sonda: idx 0 → 1 → 2, adres i lista bez zmian),
 * więc powrót na /?age=3-5 po resecie wymagał dwóch „wstecz”.
 */
describe("BottomNav — „Odkrywaj” (reset jak logo, drugi tap bez wpisu)", () => {
  beforeEach(() => cleanup());
  const odkrywaj = () => fireEvent.click(screen.getByRole("button", { name: "Odkrywaj" }));

  it("z filtrami = reset na „/”, jeden wpis historii", () => {
    wejdz("/?age=3-5&type=zoo");
    const przed = window.history.length;
    odkrywaj();
    expect(adres()).toBe("/");
    expect(window.history.length).toBe(przed + 1);
  });

  it("drugi tap na czystym „/” nie dokłada wpisu", () => {
    wejdz("/?age=3-5");
    odkrywaj();
    const przed = window.history.length;
    odkrywaj();
    odkrywaj();
    expect(adres()).toBe("/");
    expect(window.history.length).toBe(przed);
  });

  it("z otwartej mapy wraca na listę „/” (nowy wpis)", () => {
    wejdz("/?view=map");
    const przed = window.history.length;
    odkrywaj();
    expect(adres()).toBe("/");
    expect(window.history.length).toBe(przed + 1);
  });
});

describe("bottomNavDiscoverTarget", () => {
  it("czyste „/” = null", () => {
    expect(bottomNavDiscoverTarget("/", "")).toBeNull();
    expect(bottomNavDiscoverTarget("/", "?")).toBeNull();
  });
  it("„/” z parametrami, karta, strona województwa = „/”", () => {
    expect(bottomNavDiscoverTarget("/", "?age=3-5")).toBe("/");
    expect(bottomNavDiscoverTarget("/", "?view=map")).toBe("/");
    expect(bottomNavDiscoverTarget("/mazowieckie", "")).toBe("/");
    expect(bottomNavDiscoverTarget("/atrakcje/zoo-warszawa", "")).toBe("/");
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
