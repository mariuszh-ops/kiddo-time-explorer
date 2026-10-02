import { useState } from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter, useLocation } from "react-router-dom";
import MobileFilterSheet from "@/components/MobileFilterSheet";
import { useActivityFilters } from "@/hooks/useActivityFilters";

/**
 * FMN-B71: arkusz filtrów trzymał własną kopię frazy i odległości, ustawioną
 * raz przy montażu, a „Pokaż wyniki" zapisywał ją zawsze — także gdy rodzic
 * niczego w arkuszu nie zmienił.
 *
 * Zmierzone 26.09 (FMN-S krok 7, 390x844, każdy 4/4): fraza „zoo" wpisana na
 * stronie znikała po „Pokaż wyniki" (305 → 3119 wyników), skasowana wracała,
 * a suwak dopisywał 5 albo 25 km, których rodzic nie wybrał.
 */

// Suwak Radixa mierzy się ResizeObserverem, którego jsdom nie ma.
if (!("ResizeObserver" in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const liczniki = {
  city: [{ value: "mazowieckie", label: "Mazowieckie", count: 550 }],
  age: [{ value: "3-5", label: "3–5 lat", count: 10 }],
  type: [],
  indoor: [],
  activityKind: [],
  distance: [],
  price: [],
  total: 20,
  filtered: 10,
  hasAnyFilter: false,
};

const Strona = () => {
  const { filters, searchQuery, setSearchQuery, updateFilter, toggleArrayFilter, clearAllFilters } =
    useActivityFilters();
  const [otwarty, setOtwarty] = useState(false);
  const location = useLocation();
  return (
    <>
      <button onClick={() => setOtwarty(true)}>Filtry</button>
      <button onClick={() => setSearchQuery("zoo")}>Fraza na stronie</button>
      <button onClick={() => setSearchQuery("")}>Wyczyść pole na stronie</button>
      <output data-testid="adres">{location.pathname + location.search}</output>
      <output data-testid="fraza">{searchQuery}</output>
      <MobileFilterSheet
        isOpen={otwarty}
        onClose={() => setOtwarty(false)}
        filters={filters}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterCounts={liczniki}
        onUpdateFilter={(key, value, opcje) => updateFilter(key, value, opcje)}
        onToggleTypeFilter={(value, opcje) => toggleArrayFilter("type", value, opcje)}
        onClearAll={clearAllFilters}
      />
    </>
  );
};

const adres = () => screen.getByTestId("adres").textContent;
const fraza = () => screen.getByTestId("fraza").textContent;
const arkuszOtwarty = () => screen.queryByRole("dialog") !== null;
const otworz = () => {
  fireEvent.click(screen.getByRole("button", { name: "Filtry" }));
  expect(arkuszOtwarty()).toBe(true);
};
const pokazWyniki = async () => {
  fireEvent.click(screen.getByRole("button", { name: /^Pokaż wyniki/ }));
  await waitFor(() => expect(arkuszOtwarty()).toBe(false));
};
const suwak = () => Number(screen.getByRole("slider").getAttribute("aria-valuenow"));

const start = (url: string) => {
  window.history.replaceState(null, "", url);
  render(
    <BrowserRouter>
      <Strona />
    </BrowserRouter>,
  );
};

describe("MobileFilterSheet — kopia frazy i odległości (FMN-B71)", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("fraza wpisana na stronie zostaje po „Pokaż wyniki” bez zmian w arkuszu", async () => {
    start("/?age=3-5");
    fireEvent.click(screen.getByRole("button", { name: "Fraza na stronie" }));
    expect(fraza()).toBe("zoo");
    otworz();
    await pokazWyniki();
    expect(fraza()).toBe("zoo");
  });

  it("fraza skasowana na stronie nie wraca z arkusza", async () => {
    start("/?age=3-5&search=zoo");
    expect(fraza()).toBe("zoo");
    otworz();
    fireEvent.click(screen.getByRole("button", { name: "Zamknij filtry" }));
    await waitFor(() => expect(arkuszOtwarty()).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Wyczyść pole na stronie" }));
    otworz();
    await pokazWyniki();
    expect(fraza()).toBe("");
  });

  it("„Pokaż wyniki” bez zmian nie dopisuje odległości", async () => {
    start("/?region=mazowieckie&dist=25");
    otworz();
    expect(suwak()).toBe(25);
    await pokazWyniki();
    expect(adres()).toBe("/?region=mazowieckie&dist=25");
  });

  it("odznaczenie i zaznaczenie województwa zeruje suwak, a „Pokaż wyniki” nie przywraca 25 km", async () => {
    start("/?region=mazowieckie&dist=25");
    otworz();
    fireEvent.click(screen.getByRole("checkbox", { name: "Mazowieckie (550)" }));
    await waitFor(() => expect(adres()).toBe("/"));
    fireEvent.click(screen.getByRole("checkbox", { name: "Mazowieckie (550)" }));
    await waitFor(() => expect(adres()).toBe("/?region=mazowieckie"));
    expect(suwak()).toBe(0);
    await pokazWyniki();
    expect(adres()).toBe("/?region=mazowieckie");
  });

  it("„Wyczyść” + województwo: suwak 0 km, a „Pokaż wyniki” nie dopisuje 5 km", async () => {
    start("/?region=mazowieckie&dist=25");
    otworz();
    fireEvent.click(screen.getByRole("button", { name: /^Wyczyść/ }));
    await waitFor(() => expect(adres()).toBe("/"));
    fireEvent.click(screen.getByRole("checkbox", { name: "Mazowieckie (550)" }));
    await waitFor(() => expect(adres()).toBe("/?region=mazowieckie"));
    expect(suwak()).toBe(0);
    await pokazWyniki();
    expect(adres()).toBe("/?region=mazowieckie");
  });
});
