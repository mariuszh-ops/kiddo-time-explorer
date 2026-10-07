import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { toast } from "sonner";
import CatalogTable from "@/pages/admin/CatalogTable";

// GOLIVE GL-3-015: `?p=9999` — PostgREST odrzuca zakres (416 / PGRST103), a panel
// pokazywal toast „Brak uprawnień… sesja wygasła" i stan bledu. Strona poza wynikami
// ma przeniesc na ostatnia istniejaca strone z komunikatem „Brak wyników na stronie N".
const stan = vi.hoisted(() => ({
  kolejka: [] as unknown[],
  selecty: [] as unknown[][],
}));

vi.mock("@/lib/catalogClient", () => {
  // Kazde `await` na lancuchu zdejmuje kolejna odpowiedz z `stan.kolejka`.
  const builder: Record<string, unknown> = new Proxy(
    {},
    {
      get: (_cel, klucz) =>
        klucz === "then"
          ? (ok: (v: unknown) => unknown) => Promise.resolve(stan.kolejka.shift()).then(ok)
          : (...args: unknown[]) => {
              if (klucz === "select") stan.selecty.push(args);
              return builder;
            },
    },
  );
  return {
    catalogClient: { from: () => builder },
    ADMIN_COLUMNS: "*",
    FEATURED_UI_ENABLED: false,
  };
});

vi.mock("sonner", () => ({
  toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

const POZA_ZAKRESEM = {
  data: null,
  error: { code: "PGRST103", message: "Requested range not satisfiable" },
  count: null,
  status: 416,
};
const wiersze = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ place_id: `p${i}`, slug: `s${i}`, name: `Atrakcja ${i}`, type: "park" }));

const renderuj = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <CatalogTable buildQuery={(q) => q} reloadKey="" />
    </MemoryRouter>,
  );

describe("Katalog — strona poza wynikami (GL-3-015)", () => {
  beforeEach(() => {
    stan.kolejka = [];
    stan.selecty = [];
    vi.mocked(toast.info).mockClear();
    vi.mocked(toast.error).mockClear();
  });

  it("416 na ?p=9999 → liczenie (HEAD) → ostatnia strona, toast „Brak wyników”, bez „Brak uprawnień”", async () => {
    stan.kolejka = [
      POZA_ZAKRESEM,
      { data: null, error: null, count: 120, status: 200 },
      { data: wiersze(20), error: null, count: 120, status: 206 },
    ];
    const { findByText, queryByText, queryByRole } = renderuj("/admin/katalog?p=9999");
    expect(await findByText("120 rekordów")).toBeTruthy();
    expect(queryByText("Strona 3 / 3")).toBeTruthy();
    expect(queryByText("Atrakcja 19")).toBeTruthy();
    expect(queryByRole("alert")).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith("Brak wyników na stronie 9999", {
      description: "Pokazuję ostatnią stronę (3).",
    });
    // drugi select = liczenie bez wierszy
    expect(stan.selecty[1]).toEqual(["place_id", { count: "exact", head: true }]);
  });

  it("416 przy filtrze bez wyników (?p=3, 0 rekordów) → strona 1 i zwykłe „Brak rekordów”", async () => {
    stan.kolejka = [
      POZA_ZAKRESEM,
      { data: null, error: null, count: 0, status: 200 },
      { data: [], error: null, count: 0, status: 200 },
    ];
    const { findByText, queryByText, queryByRole } = renderuj("/admin/katalog?p=3");
    expect(await findByText("Brak rekordów")).toBeTruthy();
    expect(queryByText("Strona 1 / 1")).toBeTruthy();
    expect(queryByRole("alert")).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith("Brak wyników na stronie 3", {
      description: "Dla tych filtrów nie ma rekordów.",
    });
  });

  it("500 na stronie > 1 dalej daje stan błędu, bez liczenia i bez przenoszenia", async () => {
    stan.kolejka = [{ data: null, error: { message: "atrapa 500" }, count: null, status: 500 }];
    const { findByText, queryByText } = renderuj("/admin/katalog?p=3");
    expect(await findByText("Nie udało się pobrać danych.")).toBeTruthy();
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(toast.info).not.toHaveBeenCalled();
    expect(stan.selecty).toHaveLength(1);
    expect(queryByText("Brak rekordów")).toBeNull();
  });
});
