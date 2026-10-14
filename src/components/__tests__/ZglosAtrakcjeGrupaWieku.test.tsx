import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import SubmitActivityModal from "@/components/SubmitActivityModal";

/**
 * AN-6-192 (WCAG 2.2 3.3.1, 1.3.1): w „Zgłoś atrakcję” checkboxy wieku tworzą jedną grupę
 * (role="group") nazwaną etykietą „Wiek dzieci *” i opisaną komunikatem błędu. Po pustej wysyłce
 * żaden checkbox z aria-invalid nie wskazuje nieistniejącego id (wcześniej każdy miał własny,
 * zagnieżdżony FormItem/FormControl z id opisu i komunikatu, których nie było w DOM).
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

const KOMUNIKAT = "Wybierz przynajmniej jedną grupę wiekową";
const ids = (e: Element, a: string) => (e.getAttribute(a) || "").split(/\s+/).filter(Boolean);
const tekst = (id: string) => (document.getElementById(id)?.textContent || "").trim();

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

const otworz = async () => {
  render(<SubmitActivityModal isOpen onClose={() => undefined} />);
  return screen.findByRole("dialog");
};

describe("AN-6-192 — grupa „Wiek dzieci” w „Zgłoś atrakcję”", () => {
  it("checkboxy wieku są w role=group nazwanej etykietą „Wiek dzieci *”, opis = podpowiedź", async () => {
    const dlg = await otworz();
    const grupa = within(dlg).getByRole("group", { name: /^Wiek dzieci/ });
    const boxy = within(grupa).getAllByRole("checkbox");
    expect(boxy).toHaveLength(5);
    expect(ids(grupa, "aria-describedby").map(tekst)).toEqual(["Dla jakich grup wiekowych polecasz to miejsce?"]);
    for (const c of boxy) {
      expect(c.getAttribute("aria-invalid")).toBeNull();
      expect(c.getAttribute("aria-describedby")).toBeNull();
    }
  });

  it("pusta wysyłka: komunikat w opisie grupy, checkboxy aria-invalid opisane komunikatem, 0 martwych id", async () => {
    const dlg = await otworz();
    fireEvent.click(within(dlg).getByRole("button", { name: "Wyślij zgłoszenie" }));
    const komunikat = await within(dlg).findByText(KOMUNIKAT);
    expect(h.insert).not.toHaveBeenCalled();

    const grupa = within(dlg).getByRole("group", { name: /^Wiek dzieci/ });
    expect(komunikat.id).not.toBe("");
    expect(ids(grupa, "aria-describedby")).toContain(komunikat.id);

    for (const c of within(grupa).getAllByRole("checkbox")) {
      expect(c.getAttribute("aria-invalid")).toBe("true");
      expect(ids(c, "aria-describedby")).toEqual([komunikat.id]);
    }
    // żadne pole aria-invalid w dialogu nie ma opisu złożonego wyłącznie z nieistniejących id
    const martwe = [...dlg.querySelectorAll('[aria-invalid="true"]')].filter(
      (e) => !ids(e, "aria-describedby").some((id) => tekst(id).length > 0),
    );
    expect(martwe.map((e) => e.id)).toEqual([]);
  });

  it("zaznaczenie grupy po błędzie zdejmuje aria-invalid i komunikat z opisu grupy", async () => {
    const dlg = await otworz();
    fireEvent.click(within(dlg).getByRole("button", { name: "Wyślij zgłoszenie" }));
    await within(dlg).findByText(KOMUNIKAT);
    const grupa = within(dlg).getByRole("group", { name: /^Wiek dzieci/ });
    fireEvent.click(within(grupa).getByRole("checkbox", { name: "3–5 lat" }));
    await waitFor(() => expect(within(dlg).queryByText(KOMUNIKAT)).toBeNull());
    for (const c of within(grupa).getAllByRole("checkbox")) expect(c.getAttribute("aria-invalid")).toBeNull();
    expect(ids(grupa, "aria-describedby").map(tekst)).toEqual(["Dla jakich grup wiekowych polecasz to miejsce?"]);
  });
});
