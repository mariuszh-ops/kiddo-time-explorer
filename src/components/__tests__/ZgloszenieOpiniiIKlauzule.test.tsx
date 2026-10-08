import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import ReviewsSection from "@/components/ReviewsSection";
import ReportReviewButton, { REPORT_REVIEW_PREFIX } from "@/components/ReportReviewButton";
import ReportIssueButton from "@/components/ReportIssueButton";
import SubmitActivityModal from "@/components/SubmitActivityModal";

/**
 * AF-8-008/063 (DSA art. 16) — przy każdej opinii przycisk „Zgłoś”, zgłoszenie
 * idzie do istniejącej issue_reports (bez nowej tabeli, bez zapisu do bazy w teście).
 * AF-8-042/043/061 (RODO art. 13) — formularze „Zgłoś błąd w danych” i „Zgłoś atrakcję”
 * mają klauzulę z linkiem do /polityka-prywatnosci.
 */

const h = vi.hoisted(() => {
  const insert = vi.fn(async (_row: Record<string, string | null>) => ({ error: null }));
  const publicRows = [
    { id: "u-1", place_id: "place-1", rating: 4, text: "Fajne miejsce", created_at: "2026-09-01T10:00:00Z" },
  ];
  const chain = () => {
    const q: Record<string, unknown> = {};
    const result = Promise.resolve({ data: publicRows, error: null });
    q.select = () => q;
    q.eq = () => q;
    q.order = () => result;
    q.maybeSingle = () => Promise.resolve({ data: null, error: null });
    q.insert = insert;
    return q;
  };
  return { insert, from: vi.fn(() => chain()) };
});

vi.mock("@/lib/catalogClient", () => ({ catalogClient: { from: h.from } }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isLoggedIn: false, user: null }),
}));
vi.mock("@/contexts/UserRatingsContext", () => ({
  useUserRatings: () => ({ getUserRating: () => undefined }),
}));

const polityka = (root: HTMLElement) =>
  [...root.querySelectorAll("a")].map((a) => a.getAttribute("href")).filter((x) => x === "/polityka-prywatnosci");

describe("AF-8-008/063 — zgłoszenie opinii (DSA art. 16)", () => {
  beforeEach(() => {
    h.insert.mockClear();
    h.from.mockClear();
  });

  it("każda opinia (rodzica i z Google) ma przycisk „Zgłoś” w sekcji opinii", async () => {
    render(
      <ReviewsSection
        placeId="place-1"
        googleReviews={[
          { author: "Anna Kowalska", rating: 5, text: "Super", source: "google" },
          { author: "Jan Nowak", rating: 3, text: "Tak sobie", source: "google" },
        ]}
        averageRating={4.2}
        totalReviewCount={120}
        onAuthRequired={() => undefined}
      />,
    );
    await screen.findByText("Fajne miejsce");
    const przyciski = screen.getAllByRole("button", { name: /^Zgłoś opinię/ });
    expect(przyciski).toHaveLength(3);
    expect(przyciski.every((b) => b.textContent?.includes("Zgłoś"))).toBe(true);
    expect(screen.getByRole("button", { name: "Zgłoś opinię: Anna K., opinia z Google" })).toBeTruthy();
  });

  it("dialog: link do polityki, wysyłka dopiero po oświadczeniu, wpis do issue_reports z miejscem opinii", async () => {
    render(<ReportReviewButton placeId="place-1" authorLabel="Rodzic" reviewLocator="opinia rodzica (FamilyFun), id u-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Zgłoś opinię: Rodzic" }));
    const dlg = await screen.findByRole("dialog");
    expect(polityka(dlg)).toHaveLength(1);

    const wyslij = within(dlg).getByRole("button", { name: "Wyślij zgłoszenie" }) as HTMLButtonElement;
    expect(wyslij.disabled).toBe(true);

    fireEvent.change(within(dlg).getByLabelText(/Dlaczego ta treść narusza/), {
      target: { value: "Opinia podaje nazwisko i telefon pracownika." },
    });
    fireEvent.click(within(dlg).getByRole("checkbox"));
    expect(wyslij.disabled).toBe(false);
    fireEvent.click(wyslij);

    await waitFor(() => expect(h.insert).toHaveBeenCalledTimes(1));
    expect(h.from).toHaveBeenCalledWith("issue_reports");
    const wpis = h.insert.mock.calls[0][0];
    expect(wpis.category).toBe("inne");
    expect(wpis.status).toBe("nowe");
    expect(wpis.place_id).toBe("place-1");
    expect(wpis.contact_email).toBeNull();
    expect(wpis.message?.startsWith(REPORT_REVIEW_PREFIX)).toBe(true);
    expect(wpis.message).toContain("Opinia: opinia rodzica (FamilyFun), id u-1");
    expect(wpis.message).toContain("Strona: ");
    expect(wpis.message).toContain("Oświadczenie w dobrej wierze: tak");
    expect((wpis.message ?? "").length).toBeLessThanOrEqual(2000);
  });

  it("za krótkie uzasadnienie nie trafia do bazy", async () => {
    render(<ReportReviewButton placeId="place-1" authorLabel="Rodzic" reviewLocator="x" />);
    fireEvent.click(screen.getByRole("button", { name: "Zgłoś opinię: Rodzic" }));
    const dlg = await screen.findByRole("dialog");
    fireEvent.change(within(dlg).getByLabelText(/Dlaczego ta treść narusza/), { target: { value: "zle" } });
    fireEvent.click(within(dlg).getByRole("checkbox"));
    fireEvent.click(within(dlg).getByRole("button", { name: "Wyślij zgłoszenie" }));
    await new Promise((r) => setTimeout(r, 20));
    expect(h.insert).not.toHaveBeenCalled();
  });
});

describe("AF-8-042/043/061 — klauzula RODO art. 13 w formularzach z e-mailem", () => {
  it("„Zgłoś błąd w danych” ma link do /polityka-prywatnosci", async () => {
    localStorage.clear();
    render(<ReportIssueButton placeId="place-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Zgłoś błąd w danych" }));
    const dlg = await screen.findByRole("dialog");
    expect(polityka(dlg)).toHaveLength(1);
    expect(within(dlg).getByText(/Administratorem danych jest/)).toBeTruthy();
  });

  it("„Zgłoś atrakcję” ma link do /polityka-prywatnosci", async () => {
    // Radix (checkbox/select w formularzu) mierzy rozmiar przez ResizeObserver — w jsdom go nie ma.
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    render(<SubmitActivityModal isOpen onClose={() => undefined} />);
    const dlg = await screen.findByRole("dialog");
    expect(polityka(dlg)).toHaveLength(1);
    expect(within(dlg).getByText(/Administratorem danych jest/)).toBeTruthy();
  });
});
