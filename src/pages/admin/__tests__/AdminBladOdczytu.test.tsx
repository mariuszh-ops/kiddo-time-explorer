import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ComponentType } from "react";
import AdminZgloszenia from "@/pages/admin/AdminZgloszenia";
import AdminPropozycje from "@/pages/admin/AdminPropozycje";
import CatalogTable from "@/pages/admin/CatalogTable";

// GOLIVE GL-3-018/046/054/058: blad odczytu listy (500) zerowal wiersze i pokazywal
// „Brak … w tej kolejce" / „Brak rekordów" — po zgasnieciu toasta admin widzial
// falszywa pusta kolejke. Test pilnuje trwalego stanu bledu z „Spróbuj ponownie".
const stan = vi.hoisted(() => ({
  wynik: { data: null as unknown, error: null as unknown, count: null as number | null },
}));

vi.mock("@/lib/catalogClient", () => {
  // Kazde wywolanie lancucha zwraca ten sam obiekt; `await` daje biezacy `stan.wynik`.
  const builder: Record<string, unknown> = new Proxy(
    {},
    {
      get: (_cel, klucz) =>
        klucz === "then"
          ? (ok: (v: unknown) => unknown) => Promise.resolve(stan.wynik).then(ok)
          : () => builder,
    },
  );
  return {
    catalogClient: { from: () => builder },
    ADMIN_COLUMNS: "*",
    FEATURED_UI_ENABLED: false,
  };
});

const BLAD = { data: null, error: { message: "atrapa 500" }, count: null };
const PUSTO = { data: [], error: null, count: 0 };

const CatalogBezFiltrow = () => <CatalogTable buildQuery={(q) => q} reloadKey="" />;

const strony: Array<[string, ComponentType, string, RegExp]> = [
  ["Zgłoszenia", AdminZgloszenia, "Nie udało się pobrać zgłoszeń.", /Brak zgłoszeń w tej kolejce/],
  ["Propozycje", AdminPropozycje, "Nie udało się pobrać propozycji.", /Brak propozycji w tej kolejce/],
  ["Katalog", CatalogBezFiltrow, "Nie udało się pobrać danych.", /Brak rekordów/],
];

describe("Panel admina — błąd odczytu listy nie udaje pustej kolejki (GL-3-018/046/054/058)", () => {
  beforeEach(() => {
    stan.wynik = BLAD;
  });

  it.each(strony)("%s: 500 → stan błędu bez „Brak…”, ponowienie z pustą odpowiedzią → zwykła pusta kolejka", async (_n, Strona, komunikat, pusto) => {
    const { findByText, queryByText, getByRole, queryByRole } = render(
      <MemoryRouter>
        <Strona />
      </MemoryRouter>,
    );
    expect(await findByText(komunikat)).toBeTruthy();
    expect(queryByText(pusto)).toBeNull();
    expect(getByRole("alert")).toBeTruthy();

    stan.wynik = PUSTO;
    fireEvent.click(getByRole("button", { name: "Spróbuj ponownie" }));
    expect(await findByText(pusto)).toBeTruthy();
    await waitFor(() => expect(queryByRole("alert")).toBeNull());
    expect(queryByText(komunikat)).toBeNull();
  });
});
