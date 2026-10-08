import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { axe } from "vitest-axe";
import type { ComponentType } from "react";
import AdminZgloszenia from "@/pages/admin/AdminZgloszenia";
import AdminPropozycje from "@/pages/admin/AdminPropozycje";

// GOLIVE GL-3-055: przyciski stronicowania Zgloszen i Propozycji mialy sama
// ikone strzalki, bez nazwy dla czytnika (axe `button-name`, critical).
// Opinie i Katalog maja te same nazwy — test pilnuje, ze obie kolejki tez je maja.
vi.mock("@/lib/catalogClient", () => {
  const wynik = { data: [], error: null, count: 0 };
  // Kazde wywolanie lancucha zwraca ten sam obiekt; `await` daje pusta kolejke.
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

const strony: Array<[string, ComponentType]> = [
  ["Zgłoszenia", AdminZgloszenia],
  ["Propozycje", AdminPropozycje],
];

describe("Panel admina — nazwy przycisków stronicowania (GL-3-055)", () => {
  it.each(strony)("%s: oba przyciski mają nazwę i axe nie zgłasza button-name", async (_n, Strona) => {
    const { container, findByRole } = render(
      <MemoryRouter>
        <Strona />
      </MemoryRouter>,
    );
    expect(await findByRole("button", { name: "Poprzednia strona" })).toBeTruthy();
    expect(await findByRole("button", { name: "Następna strona" })).toBeTruthy();

    const wyniki = await axe(container, { runOnly: { type: "rule", values: ["button-name"] } });
    expect(wyniki.violations.map((v) => v.id)).toEqual([]);
  });
});
