import { describe, it, expect } from "vitest";
import { Suspense, useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import MultiFilterDropdown from "@/components/MultiFilterDropdown";

/**
 * AF-5-065: opcja „Kategorii” zapisuje filtr przejściem (startTransition), więc
 * nowy adres (tu: stan rodzica) dochodzi dopiero po commicie przejścia.
 * Opcja i etykieta mają się zmienić OD RAZU (optymistycznie), a po commicie
 * zgadzać się z tym, co naprawdę jest w adresie — także po „wstecz”, szybkich
 * kolejnych klikach i „wyczyść”.
 *
 * `Bramka` trzyma przejście w toku (Suspense), dopóki test jej nie otworzy.
 */

const OPCJE = [
  { value: "zoo", label: "Zoo", count: 5 },
  { value: "park-rozrywki", label: "Parki rozrywki", count: 3 },
];

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

function Bramka({ wybrane }: { wybrane: string[] }) {
  if (!otwarta && wybrane.includes("zoo")) throw brama;
  return null;
}

function Rodzic() {
  const [wybrane, setWybrane] = useState<string[]>([]);
  return (
    <Suspense fallback={null}>
      <Bramka wybrane={wybrane} />
      <MultiFilterDropdown
        label="Kategoria"
        options={OPCJE}
        selectedValues={wybrane}
        hasAnyFilter={wybrane.length > 0}
        onToggle={(v) => setWybrane((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]))}
        onClear={() => setWybrane([])}
      />
      {/* „wstecz” przeglądarki: router oddaje adres sprzed kliknięcia (zwykła, pilna aktualizacja). */}
      <button onClick={() => setWybrane([])}>wstecz</button>
      <output data-testid="adres">{wybrane.join(",")}</output>
    </Suspense>
  );
}

const opcja = (nazwa: RegExp) => screen.getByRole("option", { name: nazwa });
const zaznaczona = (nazwa: RegExp) => opcja(nazwa).getAttribute("aria-selected");
const adres = () => screen.getByTestId("adres").textContent;

function otworzListe() {
  render(<Rodzic />);
  fireEvent.click(screen.getByRole("button", { name: "Kategoria" }));
}

describe("MultiFilterDropdown — wybór optymistyczny przy zapisie przejściem (AF-5-065)", () => {
  it("opcja i etykieta zmieniają się od razu, a po commicie zgadzają się z adresem", async () => {
    nowaBrama();
    otworzListe();

    await act(async () => {
      fireEvent.click(opcja(/Zoo/));
    });
    // Przejście wisi: adres bez zmian, opcja już zaznaczona.
    expect(adres()).toBe("");
    expect(zaznaczona(/Zoo/)).toBe("true");
    expect(screen.getByRole("button", { name: /^Zoo/ })).toBeInTheDocument();

    await act(async () => {
      otworz();
      await brama;
    });
    expect(adres()).toBe("zoo");
    expect(zaznaczona(/Zoo/)).toBe("true");
  });

  it("szybkie kolejne kliki składają się w jeden wybór", async () => {
    nowaBrama();
    otworzListe();

    await act(async () => {
      fireEvent.click(opcja(/Zoo/));
    });
    await act(async () => {
      fireEvent.click(opcja(/Parki/));
    });
    expect(zaznaczona(/Zoo/)).toBe("true");
    expect(zaznaczona(/Parki/)).toBe("true");
    expect(screen.getByRole("button", { name: /^Zoo \+1/ })).toBeInTheDocument();

    await act(async () => {
      otworz();
      await brama;
    });
    expect(adres()).toBe("zoo,park-rozrywki");
    expect(zaznaczona(/Zoo/)).toBe("true");
    expect(zaznaczona(/Parki/)).toBe("true");
  });

  it("„wstecz” w trakcie przejścia: po commicie opcja pokazuje adres, nie optymizm", async () => {
    nowaBrama();
    otworzListe();

    await act(async () => {
      fireEvent.click(opcja(/Zoo/));
    });
    expect(zaznaczona(/Zoo/)).toBe("true");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "wstecz" }));
    });
    expect(adres()).toBe("");
    expect(zaznaczona(/Zoo/)).toBe("false");
  });

  it("„wyczyść” w trakcie przejścia wygrywa z optymizmem", async () => {
    nowaBrama();
    otworzListe();

    await act(async () => {
      fireEvent.click(opcja(/Zoo/));
    });
    const wyczysc = screen.getByRole("button", { name: /^Zoo/ }).querySelector("svg");
    await act(async () => {
      fireEvent.click(wyczysc!);
    });
    expect(screen.getByRole("button", { name: "Kategoria" })).toBeInTheDocument();
    expect(adres()).toBe("");
  });
});
