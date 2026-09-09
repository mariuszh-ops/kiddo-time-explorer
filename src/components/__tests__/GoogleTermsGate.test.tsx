import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import React from "react";
import AuthRequiredModal from "@/components/AuthRequiredModal";
import { STORAGE_KEYS } from "@/lib/storage";
import { __resetTermsConsentMemory } from "@/lib/termsConsent";

// jsdom nie ma ResizeObservera ani matchMedia, a Radix (Dialog, Checkbox) ich uzywa.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

const markAuthAttempt = vi.fn();
vi.mock("@/contexts/PendingIntentContext", () => ({
  usePendingIntent: () => ({ markAuthAttempt, setPendingIntent: vi.fn(), cancelPendingIntent: vi.fn() }),
}));

// Formularz e-mail montuje Turnstile — tu testujemy wylacznie sciezke Google.
vi.mock("@/components/EmailAuthForm", () => ({
  default: () => <div data-testid="email-form-mock" />,
}));

const onGoogleClick = vi.fn().mockResolvedValue(undefined);

const openModal = (props: Record<string, unknown> = {}) =>
  render(<AuthRequiredModal isOpen onClose={() => {}} onGoogleClick={onGoogleClick} {...props} />);

const googleButton = () => screen.getByRole("button", { name: /Kontynuuj z Google/i });

describe("I-07b: zgoda na regulamin przy logowaniu Google", () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetTermsConsentMemory();
    onGoogleClick.mockClear();
    markAuthAttempt.mockClear();
  });

  it("bez zaznaczonej zgody klikniecie nie startuje logowania", async () => {
    openModal();
    expect(screen.getByLabelText(/Akceptuję/i)).toBeInTheDocument();
    expect(googleButton()).toBeDisabled();

    await act(async () => {
      fireEvent.click(googleButton());
    });

    expect(onGoogleClick).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(STORAGE_KEYS.TERMS_ACCEPTED)).toBeNull();
  });

  it("odznaczenie zgody z powrotem blokuje przycisk", async () => {
    openModal();
    const checkbox = screen.getByLabelText(/Akceptuję/i);
    fireEvent.click(checkbox);
    await waitFor(() => expect(googleButton()).toBeEnabled());
    fireEvent.click(checkbox);
    await waitFor(() => expect(googleButton()).toBeDisabled());
    expect(onGoogleClick).not.toHaveBeenCalled();
  });

  it("po zaznaczeniu zgody startuje logowanie i zapisuje slad", async () => {
    openModal();
    fireEvent.click(screen.getByLabelText(/Akceptuję/i));
    await waitFor(() => expect(googleButton()).toBeEnabled());

    await act(async () => {
      fireEvent.click(googleButton());
    });

    expect(onGoogleClick).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(STORAGE_KEYS.TERMS_ACCEPTED)).toBeTruthy();
  });

  it("konto, ktore zgode juz ma, nie jest pytane ponownie", async () => {
    window.localStorage.setItem(STORAGE_KEYS.TERMS_ACCEPTED, "2026-09-01T10:00:00.000Z");
    openModal();

    expect(screen.queryByLabelText(/Akceptuję/i)).not.toBeInTheDocument();
    expect(googleButton()).toBeEnabled();

    await act(async () => {
      fireEvent.click(googleButton());
    });
    expect(onGoogleClick).toHaveBeenCalledTimes(1);
    // Data pierwszej zgody nie moze zostac nadpisana kolejnym logowaniem.
    expect(window.localStorage.getItem(STORAGE_KEYS.TERMS_ACCEPTED)).toBe("2026-09-01T10:00:00.000Z");
  });

  it("panel admina (googleOnly) tez pyta o zgode", () => {
    openModal({ googleOnly: true });
    expect(screen.getByLabelText(/Akceptuję/i)).toBeInTheDocument();
    expect(screen.queryByTestId("email-form-mock")).not.toBeInTheDocument();
    expect(googleButton()).toBeDisabled();
  });

  it("etykieta jest powiazana z checkboxem, osiagalna Tabem i ma 24x24 px (WCAG 2.5.8)", () => {
    openModal();
    const checkbox = screen.getByLabelText(/Akceptuję/i);
    expect(checkbox).toHaveAttribute("id", "google-terms-accept");
    expect(checkbox).toHaveAttribute("aria-required", "true");
    expect(checkbox.tabIndex).toBe(0);
    // h-6 w-6 = 1.5rem = 24 px; jsdom nie liczy layoutu, wiec sprawdzamy klase.
    expect(checkbox.className).toMatch(/\bh-6\b/);
    expect(checkbox.className).toMatch(/\bw-6\b/);
  });
});
