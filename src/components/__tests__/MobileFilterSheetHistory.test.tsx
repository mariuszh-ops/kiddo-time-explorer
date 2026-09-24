import { useState } from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { BrowserRouter, useLocation } from "react-router-dom";
import MobileFilterSheet from "@/components/MobileFilterSheet";
import { useActivityFilters } from "@/hooks/useActivityFilters";

/**
 * FMN-B05 (R3): systemowe „wstecz" przy otwartym arkuszu filtrów zamyka arkusz
 * i NIE cofa strony; filtry ustawione w arkuszu zostają, a każde z nich to
 * nadal jeden wpis historii (R1).
 *
 * Zmierzone 24.09 (smoke FMN-0, 390x844, repro 3/3): / → arkusz → wiek 3-5 →
 * „wstecz": adres /?age=3-5 → /, arkusz dalej otwarty.
 *
 * Test chodzi po PRAWDZIWEJ historii jsdom (BrowserRouter), bo błąd siedział
 * w kolejności wpisów, której MemoryRouter nie pokaże.
 */

const liczniki = {
  city: [],
  age: [{ value: "3-5", label: "3–5 lat", count: 10 }],
  type: [{ value: "zoo", label: "Zoo", count: 5 }],
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
      <output data-testid="adres">{location.pathname + location.search}</output>
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
const arkuszOtwarty = () => screen.queryByRole("dialog") !== null;

const otworz = () => {
  fireEvent.click(screen.getByRole("button", { name: "Filtry" }));
  expect(arkuszOtwarty()).toBe(true);
};

/** Systemowe „wstecz": popstate w jsdom przychodzi asynchronicznie. */
const wstecz = async (oczekiwanyAdres: string) => {
  act(() => window.history.back());
  await waitFor(() => expect(window.location.pathname + window.location.search).toBe(oczekiwanyAdres));
  await waitFor(() => expect(adres()).toBe(oczekiwanyAdres));
};

describe("MobileFilterSheet — „wstecz” przy otwartym arkuszu (FMN-B05, R3)", () => {
  beforeEach(() => {
    // Poprzednia strona w historii — ostatnie „wstecz" ma tu wrócić, nie dalej.
    window.history.replaceState(null, "", "/poprzednia");
    window.history.pushState(null, "", "/");
    render(
      <BrowserRouter>
        <Strona />
      </BrowserRouter>,
    );
  });

  it("zamyka arkusz, filtr zostaje, kolejne „wstecz” cofa filtr, a następne stronę", async () => {
    otworz();
    fireEvent.click(screen.getByRole("checkbox", { name: "3–5 lat (10)" }));
    expect(adres()).toBe("/?age=3-5");

    await wstecz("/?age=3-5");
    await waitFor(() => expect(arkuszOtwarty()).toBe(false));

    await wstecz("/");
    await wstecz("/poprzednia");
  });

  it("dwie zmiany w arkuszu = dwa wpisy; X zdejmuje wpis arkusza", async () => {
    otworz();
    fireEvent.click(screen.getByRole("checkbox", { name: "3–5 lat (10)" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Zoo (5)" }));
    expect(adres()).toBe("/?age=3-5&type=zoo");

    fireEvent.click(screen.getByRole("button", { name: "Zamknij filtry" }));
    await waitFor(() => expect(arkuszOtwarty()).toBe(false));
    // Atrapa zdjęta: stoimy na wpisie filtra, nie na wpisie arkusza.
    await waitFor(() => expect(window.history.state?.filterSheetOpen).toBeUndefined());
    expect(adres()).toBe("/?age=3-5&type=zoo");

    await wstecz("/?age=3-5");
    await wstecz("/");
    await wstecz("/poprzednia");
  });

  it("otwarcie i zamknięcie bez zmian nie zostawia wpisu w historii", async () => {
    otworz();
    fireEvent.click(screen.getByRole("button", { name: "Zamknij filtry" }));
    await waitFor(() => expect(window.history.state?.filterSheetOpen).toBeUndefined());
    expect(adres()).toBe("/");

    await wstecz("/poprzednia");
  });

  it("„wstecz” bez zmian w arkuszu zamyka arkusz i zostaje na stronie", async () => {
    otworz();
    await wstecz("/");
    await waitFor(() => expect(arkuszOtwarty()).toBe(false));

    await wstecz("/poprzednia");
  });

  it("„Pokaż wyniki” zamyka arkusz i zdejmuje jego wpis", async () => {
    otworz();
    fireEvent.click(screen.getByRole("checkbox", { name: "3–5 lat (10)" }));
    fireEvent.click(screen.getByRole("button", { name: /^Pokaż wyniki/ }));
    await waitFor(() => expect(arkuszOtwarty()).toBe(false));
    await waitFor(() => expect(window.history.state?.filterSheetOpen).toBeUndefined());
    expect(adres()).toBe("/?age=3-5");

    await wstecz("/");
    await wstecz("/poprzednia");
  });

  it("stary wpis arkusza pod spodem nie blokuje zamykania kolejnego arkusza", async () => {
    otworz();
    await wstecz("/");
    await waitFor(() => expect(arkuszOtwarty()).toBe(false));

    // „Naprzód" wraca na atrapę z POPRZEDNIEGO otwarcia (arkusz zamknięty).
    act(() => window.history.forward());
    await waitFor(() => expect(window.history.state?.filterSheetOpen).toBeDefined());

    // Nowe otwarcie i „wstecz" ląduje na tej starej atrapie. Ze znacznikiem
    // `true` zamiast tokenu listener uznałby, że to wciąż jego wpis.
    otworz();
    act(() => window.history.back());
    await waitFor(() => expect(arkuszOtwarty()).toBe(false));
    expect(adres()).toBe("/");
  });
});
