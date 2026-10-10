import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import SubmitActivityModal from "@/components/SubmitActivityModal";
import { filterOptions } from "@/data/activities";

/**
 * AF-10-017 (D5 = A): „Zgłoś atrakcję” pokazuje pasma wieku filtra i zapisuje ich granice.
 * Zero zapisów: insert zamockowany.
 */

const h = vi.hoisted(() => {
  const insert = vi.fn(async (_row: unknown, _opts?: unknown) => ({ error: null as unknown, count: 1 as number | null }));
  return { insert, from: vi.fn(() => ({ insert })) };
});

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock("@/lib/catalogClient", () => ({ catalogClient: { from: h.from } }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isLoggedIn: false, user: null }),
}));

const DRAFT_KEY = "ff:draft:activity-submission";

const draft = (ageGroups: string[]) =>
  sessionStorage.setItem(
    DRAFT_KEY,
    JSON.stringify({
      name: "Test pasma wieku",
      city: "inne",
      customCity: "Zator",
      address: "",
      activityType: "plac-zabaw",
      type: "place",
      eventDate: "",
      ageGroups,
      indoorOutdoor: "indoor",
      priceNote: "",
      description: "",
      link: "",
      amenities: [],
      contactEmail: "",
      savedAt: Date.now(),
    }),
  );

/** Checkboxy w grupie „Wiek dzieci”: [etykieta, zaznaczony]. */
const pasmaFormularza = (dlg: HTMLElement) => {
  const grupa = within(dlg).getByText(/^Wiek dzieci/).closest("div") as HTMLElement;
  return within(grupa)
    .getAllByRole("checkbox")
    .map((c) => [c.getAttribute("aria-label"), c.getAttribute("aria-checked") === "true"] as const);
};

const wyslij = async (dlg: HTMLElement) => {
  fireEvent.click(within(dlg).getByRole("button", { name: "Wyślij zgłoszenie" }));
  await waitFor(() => expect(h.insert).toHaveBeenCalledTimes(1));
  return h.insert.mock.calls[0][0] as { age_min: number | null; age_max: number | null };
};

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
});
afterEach(() => vi.unstubAllGlobals());

describe("AF-10-017 — pasma wieku w „Zgłoś atrakcję”", () => {
  it("formularz pokazuje dokładnie pasma filtra (te same etykiety, ta sama kolejność)", async () => {
    render(<SubmitActivityModal isOpen onClose={() => undefined} />);
    const dlg = await screen.findByRole("dialog");
    expect(pasmaFormularza(dlg).map(([l]) => l)).toEqual(filterOptions.age.map((p) => p.label));
  });

  it("zaznaczone „14+” zapisuje age 14..16", async () => {
    draft(["14-16"]);
    render(<SubmitActivityModal isOpen onClose={() => undefined} />);
    const dlg = await screen.findByRole("dialog");
    await within(dlg).findByText(/Przywróciliśmy Twój niedokończony formularz/);
    expect(await wyslij(dlg)).toMatchObject({ age_min: 14, age_max: 16 });
  });
});
