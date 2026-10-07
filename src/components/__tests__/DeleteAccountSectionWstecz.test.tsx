import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import DeleteAccountSection from "@/components/DeleteAccountSection";

const logout = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "test-user" }, logout }),
}));
const deleteAccountData = vi.fn();
vi.mock("@/lib/deleteAccount", () => ({
  deleteAccountData: (...args: unknown[]) => deleteAccountData(...args),
}));
vi.mock("@/lib/flashToast", () => ({ queueFlashToast: vi.fn() }));

const renderSection = () =>
  render(
    <BrowserRouter>
      <DeleteAccountSection />
    </BrowserRouter>,
  );

/**
 * GOLIVE GL-2-037 — regresja. Dialog „Usuń konto” otwarty, „wstecz” ma zamknąć
 * dialog i zostawić /profile (wpis-atrapa w historii). Usunięcie konta jest tu
 * w całości atrapą (`deleteAccountData` zamockowane) — zero sieci.
 */
describe("DeleteAccountSection — „wstecz” zamyka dialog (GL-2-037)", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/profile");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    logout.mockReset();
    deleteAccountData.mockReset();
  });

  it("otwarcie kładzie wpis-atrapę, „wstecz” zamyka dialog bez usuwania", async () => {
    vi.spyOn(window.history, "back").mockImplementation(() => undefined);
    renderSection();

    fireEvent.click(screen.getByRole("button", { name: /Usuń konto/ }));
    expect(await screen.findByRole("alertdialog")).toBeTruthy();
    expect(typeof window.history.state?.closeOnBackOpen).toBe("string");

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: { idx: 0 } }));
    });
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(deleteAccountData).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
  });

  it("„Anuluj” zdejmuje atrapę jednym history.back()", async () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => undefined);
    renderSection();

    fireEvent.click(screen.getByRole("button", { name: /Usuń konto/ }));
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "Anuluj" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("udane usunięcie (atrapa) przechodzi na „/” bez history.back()", async () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => undefined);
    deleteAccountData.mockResolvedValue({ ok: true });
    renderSection();

    fireEvent.click(screen.getByRole("button", { name: /Usuń konto/ }));
    await screen.findByRole("alertdialog");
    fireEvent.change(screen.getByLabelText(/Aby potwierdzić/), { target: { value: "USUWAM" } });
    fireEvent.click(screen.getByRole("button", { name: "Usuń konto na stałe" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(logout).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe("/");
    expect(window.history.state?.closeOnBackOpen).toBeUndefined();
    expect(back).not.toHaveBeenCalled();
  });
});
