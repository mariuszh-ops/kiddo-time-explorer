import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { useState } from "react";
import AdminCatalogDrawer from "@/pages/admin/AdminCatalogDrawer";
import type { CatalogRow } from "@/lib/catalogClient";

// Odczyt notatki admina (`admin_notes`) — kazde wywolanie lancucha zwraca ten
// sam obiekt, `await` daje brak notatki. Zero sieci.
vi.mock("@/lib/catalogClient", () => {
  const wynik = { data: null, error: null };
  const builder: Record<string, unknown> = new Proxy(
    {},
    {
      get: (_cel, klucz) =>
        klucz === "then"
          ? (ok: (v: unknown) => unknown) => Promise.resolve(wynik).then(ok)
          : () => builder,
    },
  );
  return {
    catalogClient: { from: () => builder },
    ADMIN_COLUMNS: "*",
    FEATURED_UI_ENABLED: false,
  };
});

const WIERSZ = {
  place_id: "p-1",
  slug: "ablandia-test",
  name: "ABlandia TEST",
  type: "park-rozrywki",
  city: "malopolskie",
  locked_fields: [],
} as unknown as CatalogRow;

const onClose = vi.fn();

const Panel = () => {
  const [editing, setEditing] = useState<CatalogRow | null>(null);
  return (
    <>
      <button type="button" onClick={() => setEditing(WIERSZ)}>
        Otwórz
      </button>
      <AdminCatalogDrawer
        row={editing}
        onClose={() => {
          onClose();
          setEditing(null);
        }}
        onSaved={() => setEditing(null)}
      />
    </>
  );
};

/**
 * GOLIVE GL-3-020 — regresja. Drawer edycji w Katalogu otwarty, „wstecz” ma
 * zamknąć drawer i zostawić panel (wpis-atrapa w historii, useCloseOnBack).
 */
describe("AdminCatalogDrawer — „wstecz” zamyka drawer (GL-3-020)", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/admin/katalog?q=ABlandia");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    onClose.mockReset();
  });

  it("otwarcie kładzie wpis-atrapę, „wstecz” zamyka drawer", async () => {
    vi.spyOn(window.history, "back").mockImplementation(() => undefined);
    render(<Panel />);

    fireEvent.click(screen.getByRole("button", { name: "Otwórz" }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(typeof window.history.state?.closeOnBackOpen).toBe("string");

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: { idx: 0 } }));
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("„Anuluj” zdejmuje atrapę jednym history.back()", async () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => undefined);
    render(<Panel />);

    fireEvent.click(screen.getByRole("button", { name: "Otwórz" }));
    await screen.findByRole("dialog");
    expect(back).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Anuluj" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(back).toHaveBeenCalledTimes(1);
  });
});
