import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BrowserRouter, useLocation } from "react-router-dom";
import HomeSearch from "@/components/HomeSearch";

vi.mock("@/hooks/useActivitySuggestions", () => ({ useActivitySuggestions: () => [] }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

/**
 * R1 (wariant A, decyzja właściciela 03.10): fraza wpisana w HomeSearch na
 * pustym „/” = replace, jak w polu nad listą (SearchAutocomplete →
 * setSearchQuery). Wcześniej Enter = navigate("/?search=…") = push, więc
 * FMN-3-041 i FMN-4-030 łapały I2 („1 push > 0”) 3/3, a wyjście ze strony
 * wymagało o jeden „wstecz” więcej (pusty „/” między stroną sprzed wejścia
 * a wynikami).
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
      <HomeSearch />
    </BrowserRouter>,
  );
};

const adres = () => screen.getByTestId("adres").textContent;
const pole = () => screen.getByRole("combobox");
const szukaj = (fraza: string) => {
  fireEvent.change(pole(), { target: { value: fraza } });
  fireEvent.keyDown(pole(), { key: "Enter" });
};

describe("HomeSearch — fraza = replace (R1, wariant A)", () => {
  beforeEach(() => cleanup());

  it("Enter na pustym „/” zapisuje ?search= bez nowego wpisu historii", () => {
    wejdz("/");
    const przed = window.history.length;
    szukaj("sala zabaw");
    expect(adres()).toBe("/?search=sala%20zabaw");
    expect(window.history.length).toBe(przed);
  });

  it("druga fraza podmienia pierwszą, dalej bez nowego wpisu", () => {
    wejdz("/?search=sala%20zabaw");
    const przed = window.history.length;
    szukaj("ochorowiczówka");
    expect(adres()).toBe("/?search=ochorowicz%C3%B3wka");
    expect(window.history.length).toBe(przed);
  });

  it("pusta fraza nic nie zapisuje", () => {
    wejdz("/");
    const przed = window.history.length;
    szukaj("   ");
    expect(adres()).toBe("/");
    expect(window.history.length).toBe(przed);
  });
});
