import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import SubmitActivityModal from "@/components/SubmitActivityModal";
import ReportIssueButton from "@/components/ReportIssueButton";

/**
 * AF-10-039/058: przekroczenie długości pola w „Zgłoś atrakcję” daje polski komunikat
 * (domyślny zod: „String must contain at most 50 character(s)”).
 * AF-10-005: surowy error.message (np. „Failed to fetch”) nie trafia do toastu.
 * AF-10-036: komunikat błędu wysyłki mówi, co zrobić.
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
// Pole „Data wydarzenia” renderuje się tylko przy FEATURES.EVENTS (dziś false) — włączone w teście,
// żeby sprawdzić komunikat także tej reguły.
vi.mock("@/lib/featureFlags", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/featureFlags")>();
  return { ...orig, FEATURES: { ...orig.FEATURES, EVENTS: true } };
});

const DRAFT_KEY = "ff:draft:activity-submission";
const FALLBACK = "Nie udało się wysłać zgłoszenia. Spróbuj ponownie albo napisz na kontakt@familyfun.pl.";
const ENG = /String must contain|Too big|Expected|Failed to fetch|TypeError/;

const draft = (over: Record<string, unknown> = {}) =>
  sessionStorage.setItem(
    DRAFT_KEY,
    JSON.stringify({
      name: "Test audyt miejsce",
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
      ...over,
    }),
  );

const toastTexts = () => JSON.stringify([...h.toast.error.mock.calls, ...h.toast.info.mock.calls]);

beforeEach(() => {
  // Radix (select/checkbox) mierzy rozmiar przez ResizeObserver — w jsdom go nie ma.
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
  h.insert.mockReset();
  h.insert.mockImplementation(async () => ({ error: null, count: 1 }));
  h.toast.error.mockClear();
  h.toast.success.mockClear();
  h.toast.info.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

describe("AF-10-039/058 — „Zgłoś atrakcję”: limity długości po polsku", () => {
  it("customCity 51, adres 201, data wydarzenia 51, cena 201 -> 4 polskie komunikaty pól, 0 angielskich, 0 zapisów", async () => {
    draft({
      customCity: "x".repeat(51),
      address: "y".repeat(201),
      type: "event",
      eventDate: "z".repeat(51),
      priceLevel: 1,
      priceNote: "p".repeat(201),
    });
    render(<SubmitActivityModal isOpen onClose={() => undefined} />);
    const dlg = await screen.findByRole("dialog");
    await within(dlg).findByText(/Przywróciliśmy Twój niedokończony formularz/);
    fireEvent.click(within(dlg).getByRole("button", { name: "Wyślij zgłoszenie" }));

    await waitFor(() => expect(within(dlg).getAllByText("Maksymalnie 50 znaków")).toHaveLength(2));
    expect(within(dlg).getAllByText("Maksymalnie 200 znaków")).toHaveLength(2);
    // komunikat jest powiązany z polem (aria-describedby) i pole ma aria-invalid
    const miasto = within(dlg).getByLabelText("Nazwa miasta");
    expect(miasto.getAttribute("aria-invalid")).toBe("true");
    const opis = (miasto.getAttribute("aria-describedby") ?? "").split(/\s+/).map((id) => document.getElementById(id)?.textContent);
    expect(opis).toContain("Maksymalnie 50 znaków");
    expect(dlg.textContent).not.toMatch(ENG);
    expect(h.insert).not.toHaveBeenCalled();
  });
});

describe("AF-10-005/036 — błąd wysyłki: bez surowego error.message, z krokiem do wykonania", () => {
  it("„Zgłoś atrakcję”: „Failed to fetch” -> polski komunikat z działaniem, wersja robocza zostaje", async () => {
    draft();
    h.insert.mockImplementation(async () => ({ error: { message: "Failed to fetch", code: "" }, count: null }));
    render(<SubmitActivityModal isOpen onClose={() => undefined} />);
    const dlg = await screen.findByRole("dialog");
    await within(dlg).findByText(/Przywróciliśmy Twój niedokończony formularz/);
    fireEvent.click(within(dlg).getByRole("button", { name: "Wyślij zgłoszenie" }));

    await waitFor(() => expect(h.toast.error).toHaveBeenCalledTimes(1));
    expect(h.insert).toHaveBeenCalledTimes(1);
    expect(h.toast.error).toHaveBeenCalledWith(FALLBACK);
    expect(toastTexts()).not.toMatch(ENG);
    expect(sessionStorage.getItem(DRAFT_KEY)).not.toBeNull();
  });

  it("„Zgłoś atrakcję”: limit z triggera (PT429) -> jego polski tekst", async () => {
    draft();
    const trigger = "Zbyt wiele zgłoszeń z tego urządzenia. Spróbuj ponownie za godzinę.";
    h.insert.mockImplementation(async () => ({ error: { code: "PT429", message: trigger }, count: null }));
    render(<SubmitActivityModal isOpen onClose={() => undefined} />);
    const dlg = await screen.findByRole("dialog");
    await within(dlg).findByText(/Przywróciliśmy Twój niedokończony formularz/);
    fireEvent.click(within(dlg).getByRole("button", { name: "Wyślij zgłoszenie" }));
    await waitFor(() => expect(h.toast.error).toHaveBeenCalledWith(trigger));
  });

  const zglosBlad = async () => {
    render(<ReportIssueButton placeId="place-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Zgłoś błąd w danych" }));
    const dlg = await screen.findByRole("dialog");
    fireEvent.change(within(dlg).getByLabelText("Opisz krótko"), {
      target: { value: "Godziny otwarcia są nieaktualne." },
    });
    fireEvent.click(within(dlg).getByRole("button", { name: "Wyślij zgłoszenie" }));
    return dlg;
  };

  it("„Zgłoś błąd w danych”: „Failed to fetch” -> polski komunikat z działaniem, bez opisu z wyjątkiem", async () => {
    h.insert.mockImplementation(async () => ({ error: { message: "Failed to fetch", code: "" }, count: null }));
    const dlg = await zglosBlad();
    await waitFor(() => expect(h.toast.error).toHaveBeenCalledTimes(1));
    expect(h.toast.error).toHaveBeenCalledWith(FALLBACK);
    expect(toastTexts()).not.toMatch(ENG);
    // dialog zostaje otwarty, treść nie ginie
    expect((within(dlg).getByDisplayValue("Godziny otwarcia są nieaktualne.") as HTMLTextAreaElement).value).toBeTruthy();
  });

  it("„Zgłoś błąd w danych”: angielski 429 -> polski komunikat limitu", async () => {
    h.insert.mockImplementation(async () => ({ error: { code: "PT429", message: "rate limit exceeded" }, count: null }));
    await zglosBlad();
    await waitFor(() => expect(h.toast.error).toHaveBeenCalledTimes(1));
    expect(h.toast.error).toHaveBeenCalledWith("Zbyt wiele zgłoszeń w tej chwili. Spróbuj ponownie później.");
  });
});

describe("AF-10-005/036/039 — straż w kodzie (regexy audytu AF-10_run.mjs)", () => {
  const src = (f: string) => readFileSync(resolve(__dirname, "..", f), "utf8");
  const pliki = ["SubmitActivityModal.tsx", "ReportIssueButton.tsx", "ReportReviewButton.tsx", "ReviewsSection.tsx"];

  it("toasty formularzy nie pokazują err.message (ani w description, ani jako tytuł)", () => {
    for (const f of pliki) {
      const t = src(f);
      expect(t, f).not.toMatch(/description:\s*\w*[eE]rr(?:or)?\w*\??\.message/);
      expect(t, f).not.toMatch(/toast(?:\.\w+)?\(\s*\w*[eE]rr(?:or)?\w*\??\.message/);
      expect(t, f).not.toMatch(/\?\s*\w*[eE]rr(?:or)?\w*\.message\s*:/);
    }
  });

  it("każda reguła .max/.min/.email na polu tekstowym (z.string) ma komunikat", () => {
    for (const f of ["SubmitActivityModal.tsx", "ReportIssueButton.tsx", "ReportReviewButton.tsx"]) {
      const t = src(f);
      const start = t.search(/z\.object\(\{/);
      const schema = t.slice(start, t.indexOf("\n});", start));
      // pole = linia "  nazwa: z..." aż do następnego pola; reguły liczymy tylko w łańcuchach z.string()
      const pola = schema.split(/\n(?=\s{2}\w+:\s*z\b)/).filter((p) => /:\s*z\s*\.?\s*string\(\)|\.\s*string\(\)/.test(p));
      expect(pola.length, f).toBeGreaterThan(0);
      const bez = pola.flatMap((p) =>
        [...p.matchAll(/\.(max|min|email)\(([^)]*)\)/g)].filter((m) => !/["`]/.test(m[2])).map((m) => f + " " + p.trim().split(":")[0] + " " + m[0]),
      );
      expect(bez).toEqual([]);
    }
  });
});
