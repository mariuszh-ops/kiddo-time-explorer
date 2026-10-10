import { describe, it, expect } from "vitest";
import { Suspense, useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MobileFilterSheet from "@/components/MobileFilterSheet";
import type { HomeFilterCounts } from "@/hooks/useHomeCatalog";
import type { Filters } from "@/hooks/useActivityFilters";

/**
 * INP (A1000-P, chip wieku P-C-03): klik opcji w arkuszu zapisuje filtr
 * przejściem (startTransition), więc nowy adres (tu: stan rodzica) dochodzi
 * dopiero po commicie przejścia. Opcja ma się zmienić OD RAZU (optymistycznie),
 * a po commicie zgadzać z adresem — także po „wstecz”, kolejnych klikach
 * i „Wyczyść”. `Bramka` trzyma przejście w toku (Suspense), dopóki test jej
 * nie otworzy (wzorzec z MultiFilterDropdownOptymizm.test.tsx).
 */
const liczniki: HomeFilterCounts = {
  city: [{ value: "mazowieckie", label: "Mazowieckie", count: 3 }],
  age: [
    { value: "3-5", label: "3–5 lat", count: 3 },
    { value: "6-9", label: "6–9 lat", count: 4 },
  ],
  type: [
    { value: "zoo", label: "Zoo", count: 3 },
    { value: "park", label: "Park i natura", count: 2 },
  ],
  indoor: [],
  activityKind: [],
  distance: [],
  price: [],
  total: 7,
  filtered: 7,
  hasAnyFilter: false,
};

let otwarta = false;
let otworz: () => void = () => {};
let brama: Promise<void> = Promise.resolve();
function nowaBrama() {
  otwarta = false;
  brama = new Promise<void>((r) => {
    otworz = () => {
      otwarta = true;
      r();
    };
  });
}

function Bramka({ filtry }: { filtry: Filters }) {
  if (!otwarta && (filtry.age || (filtry.type && filtry.type.length))) throw brama;
  return null;
}

function Rodzic() {
  const [filtry, setFiltry] = useState<Filters>({});
  const noop = () => {};
  return (
    <MemoryRouter>
      <Suspense fallback={null}>
        <Bramka filtry={filtry} />
        <MobileFilterSheet
          isOpen
          onClose={noop}
          filters={filtry}
          searchQuery=""
          onSearchChange={noop}
          filterCounts={liczniki}
          onUpdateFilter={(k, v) => setFiltry((p) => ({ ...p, [k]: v }))}
          onToggleTypeFilter={(v) =>
            setFiltry((p) => {
              const t = p.type || [];
              return { ...p, type: t.includes(v) ? t.filter((x) => x !== v) : [...t, v] };
            })
          }
          onClearAll={() => setFiltry({})}
        />
        {/* „wstecz” przeglądarki: router oddaje adres sprzed kliknięcia (zwykła, pilna aktualizacja). */}
        <button onClick={() => setFiltry({})}>wstecz</button>
        <output data-testid="adres">{JSON.stringify(filtry)}</output>
      </Suspense>
    </MemoryRouter>
  );
}

const chip = (nazwa: RegExp) => screen.getByRole("checkbox", { name: nazwa });
const zaznaczony = (nazwa: RegExp) => chip(nazwa).getAttribute("aria-checked");
const adres = () => JSON.parse(screen.getByTestId("adres").textContent || "{}");

describe("MobileFilterSheet — wybór optymistyczny przy zapisie przejściem (INP P-C-03)", () => {
  it("chip wieku zaznacza się od razu, a po commicie zgadza się z adresem", async () => {
    nowaBrama();
    render(<Rodzic />);

    await act(async () => {
      fireEvent.click(chip(/6–9 lat/));
    });
    // Przejście wisi: adres bez zmian, chip już zaznaczony.
    expect(adres()).toEqual({});
    expect(zaznaczony(/6–9 lat/)).toBe("true");
    expect(zaznaczony(/3–5 lat/)).toBe("false");

    await act(async () => {
      otworz();
      await brama;
    });
    expect(adres()).toEqual({ age: "6-9" });
    expect(zaznaczony(/6–9 lat/)).toBe("true");
  });

  it("kolejne kliki w trakcie przejścia (wiek + kategoria) składają się w jeden wybór", async () => {
    nowaBrama();
    render(<Rodzic />);

    await act(async () => {
      fireEvent.click(chip(/6–9 lat/));
    });
    await act(async () => {
      fireEvent.click(chip(/Zoo/));
    });
    expect(zaznaczony(/6–9 lat/)).toBe("true");
    expect(zaznaczony(/Zoo/)).toBe("true");

    await act(async () => {
      otworz();
      await brama;
    });
    expect(adres()).toEqual({ age: "6-9", type: ["zoo"] });
    expect(zaznaczony(/6–9 lat/)).toBe("true");
    expect(zaznaczony(/Zoo/)).toBe("true");
  });

  it("„wstecz” w trakcie przejścia: po commicie chip pokazuje adres, nie optymizm", async () => {
    nowaBrama();
    render(<Rodzic />);

    await act(async () => {
      fireEvent.click(chip(/6–9 lat/));
    });
    expect(zaznaczony(/6–9 lat/)).toBe("true");

    await act(async () => {
      // Arkusz jest modalny (Radix chowa resztę przed czytnikiem), stąd `hidden: true`.
      fireEvent.click(screen.getByRole("button", { name: "wstecz", hidden: true }));
    });
    expect(adres()).toEqual({});
    expect(zaznaczony(/6–9 lat/)).toBe("false");
  });

  it("„Wyczyść” w trakcie przejścia wygrywa z optymizmem", async () => {
    nowaBrama();
    render(<Rodzic />);

    await act(async () => {
      fireEvent.click(chip(/6–9 lat/));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Wyczyść" }));
    });
    expect(adres()).toEqual({});
    expect(zaznaczony(/6–9 lat/)).toBe("false");
  });
});
