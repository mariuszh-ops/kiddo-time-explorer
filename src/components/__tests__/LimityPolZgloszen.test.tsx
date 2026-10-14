import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import ReportReviewButton from "@/components/ReportReviewButton";
import ReportIssueButton from "@/components/ReportIssueButton";
import SubmitActivityModal from "@/components/SubmitActivityModal";
import { CONTACT_EMAIL_MAX } from "@/lib/formLimits";

/**
 * AN-8-006 / AN-8-010: e-mail kontaktowy dłuższy niż CHECK issue_reports_contact_email_check (<= 200)
 * nie wychodzi w INSERT — pole ma maxLength 200, a walidacja zatrzymuje wartość wstawioną z pominięciem
 * maxLength (fireEvent.change w jsdom nie przycina) z polskim komunikatem.
 * AN-8-015: nazwa 1-znakowa w „Zgłoś atrakcję” (CHECK activity_submissions_name_len: btrim >= 2)
 * = komunikat przy polu i 0 INSERT; pusta nazwa dalej „Podaj nazwę miejsca”.
 * Zero zapisów: insert zamockowany.
 */

const h = vi.hoisted(() => {
  const insert = vi.fn(async (_row: unknown, _opts?: unknown) => ({ error: null as unknown, count: 1 as number | null }));
  const toast = { error: vi.fn(), success: vi.fn(), info: vi.fn() };
  return { insert, toast, from: vi.fn(() => ({ insert })) };
});

vi.mock("sonner", () => ({ toast: h.toast }));
vi.mock("@/lib/catalogClient", () => ({ catalogClient: { from: h.from } }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isLoggedIn: false, user: null }),
}));

// 206 znaków — ten sam adres co w AN-8 (an8_goscie.mjs EMAIL207)
const EMAIL_206 = "a".repeat(60) + "@" + "b".repeat(60) + "." + "c".repeat(60) + "." + "d".repeat(20) + ".pl";
const EMAIL_200 = "a".repeat(64) + "@" + "b".repeat(60) + "." + "c".repeat(60) + "." + "d".repeat(10) + ".pl";
const DRAFT_KEY = "ff:draft:activity-submission";

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  sessionStorage.clear();
  localStorage.clear();
  h.insert.mockClear();
  h.toast.error.mockClear();
  h.toast.success.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

const zglosOpinie = async (email: string) => {
  render(<ReportReviewButton placeId="place-1" authorLabel="Rodzic" reviewLocator="opinia rodzica, id u-1" />);
  fireEvent.click(screen.getByRole("button", { name: "Zgłoś opinię: Rodzic" }));
  const dlg = await screen.findByRole("dialog");
  fireEvent.change(within(dlg).getByLabelText(/Dlaczego ta treść narusza/), {
    target: { value: "Opinia podaje nazwisko i telefon pracownika." },
  });
  const pole = within(dlg).getByLabelText(/Twój e-mail/) as HTMLInputElement;
  fireEvent.change(pole, { target: { value: email } });
  fireEvent.click(within(dlg).getByRole("checkbox"));
  fireEvent.click(within(dlg).getByRole("button", { name: "Wyślij zgłoszenie" }));
  return pole;
};

const zglosBlad = async (email: string) => {
  render(<ReportIssueButton placeId="place-1" />);
  fireEvent.click(screen.getByRole("button", { name: "Zgłoś błąd w danych" }));
  const dlg = await screen.findByRole("dialog");
  fireEvent.change(within(dlg).getByLabelText("Opisz krótko"), { target: { value: "Godziny otwarcia są nieaktualne." } });
  const pole = within(dlg).getByLabelText(/Twój e-mail/) as HTMLInputElement;
  fireEvent.change(pole, { target: { value: email } });
  fireEvent.click(within(dlg).getByRole("button", { name: "Wyślij zgłoszenie" }));
  return pole;
};

describe("AN-8-006/010 — e-mail kontaktowy <= 200 znaków (CHECK bazy)", () => {
  it("stała = 200", () => {
    expect(CONTACT_EMAIL_MAX).toBe(200);
    expect(EMAIL_206).toHaveLength(206);
    expect(EMAIL_200).toHaveLength(200);
  });

  for (const [nazwa, zglos] of [
    ["Zgłoś opinię", zglosOpinie],
    ["Zgłoś błąd w danych", zglosBlad],
  ] as const) {
    it(`${nazwa}: e-mail 206 znaków -> 0 INSERT, polski komunikat, pole maxLength 200`, async () => {
      const pole = await zglos(EMAIL_206);
      await waitFor(() => expect(h.toast.error).toHaveBeenCalledWith("Maksymalnie 200 znaków"));
      expect(h.insert).not.toHaveBeenCalled();
      expect(pole.maxLength).toBe(200);
    });

    it(`${nazwa}: e-mail dokładnie 200 znaków -> 1 INSERT z tym adresem`, async () => {
      await zglos(EMAIL_200);
      await waitFor(() => expect(h.insert).toHaveBeenCalledTimes(1));
      expect((h.insert.mock.calls[0][0] as { contact_email: string }).contact_email).toBe(EMAIL_200);
    });
  }
});

describe("AN-8-015 — „Zgłoś atrakcję”: nazwa min. 2 znaki po trim (CHECK bazy)", () => {
  const draft = (name: string) =>
    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        name,
        city: "inne",
        customCity: "Zator",
        address: "",
        activityType: "plac-zabaw",
        type: "place",
        eventDate: "",
        ageGroups: ["0-3"],
        indoorOutdoor: "indoor",
        priceLevel: undefined,
        priceNote: "",
        description: "",
        link: "",
        amenities: [],
        contactEmail: "",
        savedAt: Date.now(),
      }),
    );

  const wyslij = async () => {
    render(<SubmitActivityModal isOpen onClose={() => undefined} />);
    const dlg = await screen.findByRole("dialog");
    await within(dlg).findByText(/Przywróciliśmy Twój niedokończony formularz/);
    fireEvent.click(within(dlg).getByRole("button", { name: "Wyślij zgłoszenie" }));
    return dlg;
  };
  const komunikatPola = (dlg: HTMLElement) => {
    const pole = within(dlg).getByPlaceholderText("np. Park Jordana, Muzeum Nauki");
    return {
      invalid: pole.getAttribute("aria-invalid"),
      opis: (pole.getAttribute("aria-describedby") ?? "").split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? ""),
    };
  };

  for (const nazwa of ["X", " X "]) {
    it(`nazwa „${nazwa}” -> komunikat przy polu, aria-invalid, 0 INSERT`, async () => {
      draft(nazwa);
      const dlg = await wyslij();
      await waitFor(() => expect(within(dlg).getByText("Nazwa musi mieć co najmniej 2 znaki")).toBeTruthy());
      const k = komunikatPola(dlg);
      expect(k.invalid).toBe("true");
      expect(k.opis).toContain("Nazwa musi mieć co najmniej 2 znaki");
      expect(h.insert).not.toHaveBeenCalled();
      expect(h.toast.error).not.toHaveBeenCalled();
    });
  }

  it("pusta nazwa -> dalej „Podaj nazwę miejsca” (pierwszy błąd)", async () => {
    draft("");
    const dlg = await wyslij();
    await waitFor(() => expect(within(dlg).getByText("Podaj nazwę miejsca")).toBeTruthy());
    expect(within(dlg).queryByText("Nazwa musi mieć co najmniej 2 znaki")).toBeNull();
    expect(h.insert).not.toHaveBeenCalled();
  });

  it("nazwa 2-znakowa „Ab” -> 1 INSERT z tą nazwą", async () => {
    draft("Ab");
    await wyslij();
    await waitFor(() => expect(h.insert).toHaveBeenCalledTimes(1));
    expect((h.insert.mock.calls[0][0] as { name: string }).name).toBe("Ab");
  });
});
