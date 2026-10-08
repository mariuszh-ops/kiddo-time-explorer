import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ResetPassword from "@/pages/ResetPassword";

// AF-6-024 (WCAG 3.3.1, 1.3.1): komunikat błędu pod polem „Nowe hasło” ma być
// powiązany z polem (aria-describedby) i oznaczać je jako błędne (aria-invalid),
// tak jak w AccountSettingsSection. Wcześniej był luźnym <p> bez id.

const updateUser = vi.fn(async () => ({
  error: { message: "New password should be different from the old password.", code: "same_password", status: 422 },
}));

vi.mock("@/lib/catalogClient", () => ({
  catalogClient: {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "u1" } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      updateUser: (...a: unknown[]) => updateUser(...(a as [])),
    },
  },
}));
vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
vi.mock("@/components/SEOHead", () => ({ default: () => null }));

const renderuj = () =>
  render(
    <MemoryRouter initialEntries={["/reset-password"]}>
      <ResetPassword />
    </MemoryRouter>
  );

describe("ResetPassword — błąd pola powiązany z polem (AF-6-024)", () => {
  it("bez błędu pole nie jest oznaczone jako błędne", async () => {
    renderuj();
    const pole = await screen.findByLabelText("Nowe hasło");
    expect(pole.getAttribute("aria-invalid")).toBeNull();
    expect(pole.getAttribute("aria-describedby")).toBeNull();
  });

  it("błąd z serwera: aria-invalid=true i aria-describedby wskazuje komunikat (role=alert)", async () => {
    renderuj();
    const pole = await screen.findByLabelText("Nowe hasło");
    fireEvent.change(pole, { target: { value: "Haslo!2026x" } });
    fireEvent.click(screen.getByRole("button", { name: "Zapisz nowe hasło" }));

    const komunikat = await screen.findByRole("alert");
    expect(komunikat.textContent?.trim()).not.toBe("");
    await waitFor(() => expect(pole.getAttribute("aria-invalid")).toBe("true"));
    const id = pole.getAttribute("aria-describedby");
    expect(id).toBe(komunikat.id);
    expect(document.getElementById(id as string)).toBe(komunikat);
    expect(komunikat.className).toContain("text-destructive");
  });
});
