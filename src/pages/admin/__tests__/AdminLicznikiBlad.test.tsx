import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminDoPrzejrzenia from "@/pages/admin/AdminDoPrzejrzenia";

// GOLIVE GL-3-041: blad odczytu licznikow „Do przejrzenia" (HEAD 500) zamienial sie w null,
// a null renderowal sie jak ladowanie — 7× „…" na zawsze, bez informacji o bledzie.
const stan = vi.hoisted(() => ({
  wynik: { data: null as unknown, error: null as unknown, count: null as number | null },
}));

vi.mock("@/lib/catalogClient", () => {
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
const OK = { data: [], error: null, count: 7 };

const karta = (c: HTMLElement) => c.querySelector("div.bg-card") as HTMLElement;
const kropki = (c: HTMLElement) =>
  [...karta(c).querySelectorAll("button span, strong")].filter((s) => s.textContent?.trim() === "…").length;

describe("Do przejrzenia — błąd liczników nie udaje ładowania (GL-3-041)", () => {
  beforeEach(() => {
    stan.wynik = BLAD;
  });

  it("500 → 7 znaczników „błąd” i komunikat; „Policz ponownie” z udanym odczytem → liczby", async () => {
    const { container, findByText, getByRole, queryByText } = render(
      <MemoryRouter>
        <AdminDoPrzejrzenia />
      </MemoryRouter>,
    );
    expect(await findByText(/Nie udało się pobrać liczników/)).toBeTruthy();
    await waitFor(() => expect(container.querySelectorAll("[data-licznik-blad]").length).toBe(7));
    expect(kropki(container)).toBe(0);

    stan.wynik = OK;
    fireEvent.click(getByRole("button", { name: "Policz ponownie" }));
    await waitFor(() => expect(container.querySelectorAll("[data-licznik-blad]").length).toBe(0));
    expect(queryByText(/Nie udało się pobrać liczników/)).toBeNull();
    expect(kropki(container)).toBe(0);
    expect(karta(container).textContent).toContain("7 z 7");
  });

  it("udany odczyt od razu → liczby, bez znaczników błędu i bez komunikatu", async () => {
    stan.wynik = OK;
    const { container, queryByText } = render(
      <MemoryRouter>
        <AdminDoPrzejrzenia />
      </MemoryRouter>,
    );
    await waitFor(() => expect(karta(container).textContent).toContain("7 z 7"));
    expect(container.querySelectorAll("[data-licznik-blad]").length).toBe(0);
    expect(queryByText(/Nie udało się pobrać liczników/)).toBeNull();
    expect(kropki(container)).toBe(0);
  });
});
