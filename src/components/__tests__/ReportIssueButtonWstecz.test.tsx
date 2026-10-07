import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import ReportIssueButton from "@/components/ReportIssueButton";

vi.mock("@/lib/catalogClient", () => ({
  catalogClient: { from: vi.fn() },
}));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

/**
 * GOLIVE GL-4-056 — regresja. Dialog „Zgłoś błąd w danych” otwarty, „wstecz”
 * ma zamknąć dialog i zostawić kartę (wpis-atrapa w historii), a wpisany tekst
 * ma przetrwać do ponownego otwarcia.
 */
describe("ReportIssueButton — „wstecz” zamyka dialog (GL-4-056)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("otwarcie kładzie wpis-atrapę, „wstecz” zamyka dialog, tekst zostaje", async () => {
    vi.spyOn(window.history, "back").mockImplementation(() => undefined);
    render(<ReportIssueButton placeId="test-place" />);

    fireEvent.click(screen.getByRole("button", { name: "Zgłoś błąd w danych" }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(typeof window.history.state?.closeOnBackOpen).toBe("string");

    fireEvent.change(screen.getByLabelText("Opisz krótko"), {
      target: { value: "Zamknięte od czerwca" },
    });

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: { idx: 0 } }));
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "Zgłoś błąd w danych" }));
    await screen.findByRole("dialog");
    expect((screen.getByLabelText("Opisz krótko") as HTMLTextAreaElement).value).toBe(
      "Zamknięte od czerwca",
    );
  });

  it("„Anuluj” zdejmuje atrapę jednym history.back()", async () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => undefined);
    render(<ReportIssueButton placeId="test-place" />);

    fireEvent.click(screen.getByRole("button", { name: "Zgłoś błąd w danych" }));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Anuluj" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(back).toHaveBeenCalledTimes(1);
  });
});
