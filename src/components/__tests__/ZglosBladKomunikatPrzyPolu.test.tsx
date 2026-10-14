import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import ReportIssueButton from "@/components/ReportIssueButton";

/**
 * AN-12-079 (WCAG 3.3.1): „Zgłoś błąd w danych” — błąd walidacji jest przy polu
 * (aria-invalid + aria-describedby z polskim komunikatem) i fokus trafia na pierwsze błędne pole,
 * a nie tylko znikający toast z fokusem na przycisku „Wyślij zgłoszenie”. Zero zapisów: insert zamockowany.
 */

const h = vi.hoisted(() => {
  const insert = vi.fn(async (_row: unknown) => ({ error: null as unknown }));
  const toast = { error: vi.fn(), success: vi.fn(), info: vi.fn() };
  return { insert, toast, from: vi.fn(() => ({ insert })) };
});

vi.mock("sonner", () => ({ toast: h.toast }));
vi.mock("@/lib/catalogClient", () => ({ catalogClient: { from: h.from } }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  localStorage.clear();
  h.insert.mockClear();
  h.toast.error.mockClear();
  h.toast.success.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

const otworz = async () => {
  render(<ReportIssueButton placeId="place-1" />);
  fireEvent.click(screen.getByRole("button", { name: "Zgłoś błąd w danych" }));
  const dlg = await screen.findByRole("dialog");
  return {
    dlg,
    opis: within(dlg).getByLabelText("Opisz krótko") as HTMLTextAreaElement,
    email: within(dlg).getByLabelText(/Twój e-mail/) as HTMLInputElement,
    wyslij: () => fireEvent.click(within(dlg).getByRole("button", { name: "Wyślij zgłoszenie" })),
  };
};

const komunikat = (pole: HTMLElement) =>
  (pole.getAttribute("aria-describedby") ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent)
    .join(" | ");

describe("AN-12-079 — „Zgłoś błąd w danych”: komunikat przy polu + fokus", () => {
  it("pusta wysyłka -> komunikat przy opisie, fokus na opisie, bez toastu i bez INSERT", async () => {
    const { opis, wyslij } = await otworz();
    wyslij();
    await waitFor(() => expect(opis.getAttribute("aria-invalid")).toBe("true"));
    expect(komunikat(opis)).toBe("Napisz kilka słów, co się nie zgadza");
    expect(document.activeElement).toBe(opis);
    expect(h.toast.error).not.toHaveBeenCalled();
    expect(h.insert).not.toHaveBeenCalled();
  });

  it("zły e-mail przy poprawnym opisie -> komunikat przy e-mailu, fokus na e-mailu", async () => {
    const { opis, email, wyslij } = await otworz();
    fireEvent.change(opis, { target: { value: "Godziny otwarcia są nieaktualne." } });
    fireEvent.change(email, { target: { value: "abc" } });
    wyslij();
    await waitFor(() => expect(email.getAttribute("aria-invalid")).toBe("true"));
    expect(komunikat(email)).toBe("Nieprawidłowy adres e-mail");
    expect(document.activeElement).toBe(email);
    expect(opis.getAttribute("aria-invalid")).toBeNull();
    expect(h.insert).not.toHaveBeenCalled();
  });

  it("oba pola błędne -> fokus na pierwszym (opis), komunikaty przy obu", async () => {
    const { opis, email, wyslij } = await otworz();
    fireEvent.change(email, { target: { value: "abc" } });
    wyslij();
    await waitFor(() => expect(opis.getAttribute("aria-invalid")).toBe("true"));
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(opis);
  });

  it("poprawienie pola zdejmuje błąd, a wysyłka idzie (1 INSERT)", async () => {
    const { opis, wyslij } = await otworz();
    wyslij();
    await waitFor(() => expect(opis.getAttribute("aria-invalid")).toBe("true"));
    fireEvent.change(opis, { target: { value: "Godziny otwarcia są nieaktualne." } });
    expect(opis.getAttribute("aria-invalid")).toBeNull();
    expect(opis.getAttribute("aria-describedby")).toBeNull();
    wyslij();
    await waitFor(() => expect(h.insert).toHaveBeenCalledTimes(1));
  });
});
