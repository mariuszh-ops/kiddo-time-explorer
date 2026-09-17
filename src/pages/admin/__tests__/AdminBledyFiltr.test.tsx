import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { axe } from "vitest-axe";
// vitest-axe eksportuje matcher bez typow wartosci — rejestrujemy go przez namespace.
import * as vitestAxeMatchers from "vitest-axe/matchers";
import type { AxeResults } from "axe-core";
import AdminBledy from "@/pages/admin/AdminBledy";

expect.extend(vitestAxeMatchers as Parameters<typeof expect.extend>[0]);

const bezNaruszen = (results: AxeResults) => {
  (expect(results) as unknown as { toHaveNoViolations(): void }).toHaveNoViolations();
};

// jsdom nie liczy layoutu, wiec reguly zalezne od malowania (kontrast) sa wylaczone.
const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false } } };

// Y-A-07: panel bledow dostal filtr po tresci. Test pilnuje, ze filtruje po
// `message` I po `page`, ze nie gubi wierszy przy pustej frazie i ze po pustym
// wyniku da sie wrocic bez przeladowania strony.
const { wiersze } = vi.hoisted(() => ({
  wiersze: [
    {
      id: 1,
      kind: "error",
      message: "Cannot read properties of null (reading 'map')",
      page: "/malopolskie",
      user_agent: "Mozilla/5.0 (Windows NT 10.0) Chrome/128.0.0.0",
      hits: 12,
      user_id: null,
      created_at: "2026-09-10T08:00:00Z",
      last_seen_at: "2026-09-16T08:00:00Z",
    },
    {
      id: 2,
      kind: "unhandledrejection",
      message: "Failed to fetch",
      page: "/profile",
      user_agent: "Mozilla/5.0 (iPhone) Safari Version/17.0",
      hits: 3,
      user_id: "abcdef12-0000-0000-0000-000000000000",
      created_at: "2026-09-14T08:00:00Z",
      last_seen_at: "2026-09-15T08:00:00Z",
    },
    {
      id: 3,
      kind: "error",
      message: "ResizeObserver loop limit exceeded",
      page: "/mapa",
      user_agent: "HeadlessChrome/128.0.0.0",
      hits: 1,
      user_id: null,
      created_at: "2026-09-15T08:00:00Z",
      last_seen_at: "2026-09-15T09:00:00Z",
    },
  ],
}));

vi.mock("@/lib/catalogClient", () => {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.gte = () => builder;
  builder.order = () => builder;
  builder.limit = () => Promise.resolve({ data: wiersze, error: null });
  return { catalogClient: { from: () => builder } };
});

function renderuj() {
  return render(
    <HelmetProvider>
      <AdminBledy />
    </HelmetProvider>,
  );
}

describe("AdminBledy — filtr po tresci (Y-A-07)", () => {
  it("pole ma etykiete dla czytnika, przyjmuje fokus i zawęża listę po komunikacie", async () => {
    const { container, getByLabelText } = renderuj();
    await waitFor(() =>
      expect(container.querySelectorAll("tbody tr").length).toBe(3),
    );

    const pole = getByLabelText("Szukaj w treści błędu") as HTMLInputElement;
    expect(pole.getAttribute("placeholder")).toBe("Szukaj w treści błędu");
    expect(pole.hasAttribute("disabled")).toBe(false);
    pole.focus();
    expect(document.activeElement).toBe(pole);

    fireEvent.change(pole, { target: { value: "cannot read" } });
    await waitFor(() =>
      expect(container.querySelectorAll("tbody tr").length).toBe(1),
    );
    expect(container.textContent).toContain("Pasuje 1 z 3 wpisów");
  });

  it("szuka takze po adresie strony", async () => {
    const { container, getByLabelText } = renderuj();
    await waitFor(() =>
      expect(container.querySelectorAll("tbody tr").length).toBe(3),
    );

    fireEvent.change(getByLabelText("Szukaj w treści błędu"), {
      target: { value: "/profile" },
    });
    await waitFor(() =>
      expect(container.querySelectorAll("tbody tr").length).toBe(1),
    );
    expect(container.textContent).toContain("Failed to fetch");
  });

  it("pusty wynik mowi ile bylo wpisow i daje wrocic jednym klikiem", async () => {
    const { container, getByLabelText, getByText } = renderuj();
    await waitFor(() =>
      expect(container.querySelectorAll("tbody tr").length).toBe(3),
    );

    fireEvent.change(getByLabelText("Szukaj w treści błędu"), {
      target: { value: "zzz-nie-ma-takiego" },
    });
    await waitFor(() =>
      expect(container.querySelectorAll("tbody tr").length).toBe(0),
    );
    expect(container.textContent).toContain("Żaden z 3 wpisów nie pasuje");

    fireEvent.click(getByText("Wyczyść filtr"));
    await waitFor(() =>
      expect(container.querySelectorAll("tbody tr").length).toBe(3),
    );
  });

  it("puste i bialoznakowe zapytanie pokazuje wszystko", async () => {
    const { container, getByLabelText } = renderuj();
    await waitFor(() =>
      expect(container.querySelectorAll("tbody tr").length).toBe(3),
    );

    fireEvent.change(getByLabelText("Szukaj w treści błędu"), {
      target: { value: "   " },
    });
    await waitFor(() =>
      expect(container.querySelectorAll("tbody tr").length).toBe(3),
    );
    expect(container.textContent).not.toContain("Pasuje");
  });

  it("pole filtra nie wnosi naruszen dostepnosci (axe)", async () => {
    const { container, getByLabelText } = renderuj();
    await waitFor(() =>
      expect(container.querySelectorAll("tbody tr").length).toBe(3),
    );
    bezNaruszen(await axe(container, AXE_OPTIONS));

    fireEvent.change(getByLabelText("Szukaj w treści błędu"), {
      target: { value: "zzz-nie-ma-takiego" },
    });
    await waitFor(() =>
      expect(container.textContent).toContain("Żaden z 3 wpisów nie pasuje"),
    );
    bezNaruszen(await axe(container, AXE_OPTIONS));
  });
});
