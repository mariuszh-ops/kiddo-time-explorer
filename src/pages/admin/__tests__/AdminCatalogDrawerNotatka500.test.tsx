import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useState } from "react";
import AdminCatalogDrawer from "@/pages/admin/AdminCatalogDrawer";
import type { CatalogRow } from "@/lib/catalogClient";

// Atrapa klienta katalogu: PATCH rekordu się udaje, upsert notatki zwraca błąd
// albo sukces (sterowane z testu). Zero sieci.
const stan = vi.hoisted(() => ({
  update: [] as Record<string, unknown>[],
  upsert: [] as Record<string, unknown>[],
  notatkaBlad: true,
}));

vi.mock("@/lib/catalogClient", () => {
  const lancuch = (wynik: () => unknown) => {
    const builder: Record<string, unknown> = new Proxy(
      {},
      {
        get: (_cel, klucz) =>
          klucz === "then"
            ? (ok: (v: unknown) => unknown) => Promise.resolve(wynik()).then(ok)
            : () => builder,
      },
    );
    return builder;
  };
  return {
    catalogClient: {
      from: () => ({
        // odczyt notatki: brak notatki
        select: () => lancuch(() => ({ data: null, error: null })),
        update: (patch: Record<string, unknown>) => {
          stan.update.push(patch);
          return lancuch(() => ({
            data: { place_id: "p-1", slug: "ablandia-test", name: "ABlandia TEST", ...patch },
            error: null,
          }));
        },
        upsert: (wiersz: Record<string, unknown>) => {
          stan.upsert.push(wiersz);
          return lancuch(() =>
            stan.notatkaBlad
              ? { data: null, error: { message: "atrapa 500" } }
              : { data: [{ place_id: "p-1" }], error: null },
          );
        },
      }),
    },
    ADMIN_COLUMNS: "*",
    FEATURED_UI_ENABLED: false,
  };
});

const toasty = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { error: toasty.error, success: toasty.success, info: vi.fn() }),
}));

const WIERSZ = {
  place_id: "p-1",
  slug: "ablandia-test",
  name: "ABlandia TEST",
  type: "park-rozrywki",
  city: "malopolskie",
  locked_fields: [],
} as unknown as CatalogRow;

const onSaved = vi.fn();
const onRecordSaved = vi.fn();

const Panel = () => {
  const [editing, setEditing] = useState<CatalogRow | null>(WIERSZ);
  return (
    <AdminCatalogDrawer
      row={editing}
      onClose={() => setEditing(null)}
      onSaved={(u) => {
        onSaved(u);
        setEditing(null);
      }}
      onRecordSaved={onRecordSaved}
    />
  );
};

/**
 * GOLIVE GL-3-027 — regresja. Rekord zapisany, notatka 500: drawer zostaje
 * otwarty, wpisana notatka nie przepada, tabela dostaje zapisany wiersz.
 */
describe("AdminCatalogDrawer — notatka 500 po zapisanym rekordzie (GL-3-027)", () => {
  beforeEach(() => {
    stan.update.length = 0;
    stan.upsert.length = 0;
    stan.notatkaBlad = true;
    onSaved.mockReset();
    onRecordSaved.mockReset();
    toasty.error.mockReset();
    toasty.success.mockReset();
    window.history.replaceState(null, "", "/admin/katalog");
  });

  it("drawer zostaje, notatka zachowana, ponowny zapis wysyła już tylko notatkę", async () => {
    render(<Panel />);
    const notatka = (await screen.findByLabelText(/Notatka wewnętrzna/)) as HTMLTextAreaElement;
    await waitFor(() => expect(notatka.disabled).toBe(false));

    fireEvent.change(document.getElementById("dr-city") as HTMLInputElement, {
      target: { value: "Rytro TEST" },
    });
    fireEvent.change(notatka, { target: { value: "Ważna notatka do zachowania" } });
    fireEvent.click(screen.getByRole("button", { name: "Zapisz" }));

    await waitFor(() =>
      expect(toasty.error).toHaveBeenCalledWith(
        "Zapisano rekord, ale notatka się nie udała",
        expect.anything(),
      ),
    );
    expect(stan.update).toHaveLength(1);
    expect(stan.upsert).toHaveLength(1);
    expect(onSaved).not.toHaveBeenCalled();
    expect(onRecordSaved).toHaveBeenCalledTimes(1);
    expect(onRecordSaved.mock.calls[0][0]).toMatchObject({ place_id: "p-1", city: "Rytro TEST" });
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect((document.getElementById("dr-note") as HTMLTextAreaElement).value).toBe(
      "Ważna notatka do zachowania",
    );

    // Ponowne „Zapisz” po naprawie notatki: bez drugiego PATCH-a rekordu.
    stan.notatkaBlad = false;
    await waitFor(() =>
      expect((screen.getByRole("button", { name: "Zapisz" }) as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "Zapisz" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(stan.update).toHaveLength(1);
    expect(stan.upsert).toHaveLength(2);
    expect(toasty.success).toHaveBeenCalledWith("Zapisano zmiany");
    expect(onSaved.mock.calls[0][0]).toMatchObject({ place_id: "p-1", city: "Rytro TEST" });
  });

  it("sama notatka 500 (bez zmian rekordu): drawer zostaje, bez onRecordSaved", async () => {
    render(<Panel />);
    const notatka = (await screen.findByLabelText(/Notatka wewnętrzna/)) as HTMLTextAreaElement;
    await waitFor(() => expect(notatka.disabled).toBe(false));

    fireEvent.change(notatka, { target: { value: "Tylko notatka" } });
    fireEvent.click(screen.getByRole("button", { name: "Zapisz" }));

    await waitFor(() =>
      expect(toasty.error).toHaveBeenCalledWith("Nie udało się zapisać notatki", expect.anything()),
    );
    expect(stan.update).toHaveLength(0);
    expect(onSaved).not.toHaveBeenCalled();
    expect(onRecordSaved).not.toHaveBeenCalled();
    expect((document.getElementById("dr-note") as HTMLTextAreaElement).value).toBe("Tylko notatka");
  });
});
