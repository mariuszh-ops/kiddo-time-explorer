import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import React from "react";
import AuthRequiredModal from "@/components/AuthRequiredModal";
import { STORAGE_KEYS } from "@/lib/storage";
import { TERMS_ERROR_MESSAGE, __resetTermsConsentMemory } from "@/lib/termsConsent";

// AN-12-084: modal rejestracji mial dwa niezalezne pola „Akceptuję Regulamin…”
// (bramka Google + formularz e-mail). Teraz jedna zgoda obsluguje obie sciezki.

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

vi.mock("@/contexts/PendingIntentContext", () => ({
  usePendingIntent: () => ({ markAuthAttempt: vi.fn(), setPendingIntent: vi.fn(), cancelPendingIntent: vi.fn() }),
}));

// Captcha od razu zwraca token — testujemy zgode, nie Turnstile.
vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: React.forwardRef(
    (
      props: { onWidgetLoad?: () => void; onSuccess?: (token: string) => void },
      ref: React.Ref<{ reset: () => void }>,
    ) => {
      React.useImperativeHandle(ref, () => ({ reset: () => {} }));
      React.useEffect(() => {
        props.onWidgetLoad?.();
        props.onSuccess?.("test-captcha-token");
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <div data-testid="turnstile-mock" />;
    },
  ),
}));

const signUpWithEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    signUpWithEmail,
    signInWithEmail: vi.fn().mockResolvedValue(undefined),
    resendConfirmation: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn().mockResolvedValue(undefined),
  }),
}));

const onGoogleClick = vi.fn().mockResolvedValue(undefined);
const googleButton = () => screen.getByRole("button", { name: /Kontynuuj z Google/i });
const submitButton = () => screen.getByRole("button", { name: "Załóż konto" });

const openSignup = async () => {
  render(<AuthRequiredModal isOpen onClose={() => {}} onGoogleClick={onGoogleClick} />);
  fireEvent.click(screen.getByRole("button", { name: /Nie mam konta/ }));
  await screen.findByRole("heading", { name: "Załóż konto" });
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "rodzina@example.com" } });
  fireEvent.change(screen.getByLabelText("Hasło"), { target: { value: "Abcdef1!" } });
};

describe("AN-12-084: jedna zgoda w modalu rejestracji", () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetTermsConsentMemory();
    vi.clearAllMocks();
  });

  it("tryb rejestracji ma dokladnie jeden checkbox zgody", async () => {
    await openSignup();
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
    expect(screen.getAllByText(/Akceptuję/)).toHaveLength(1);
  });

  it("jedno zaznaczenie odblokowuje Google i rejestracje e-mailem", async () => {
    await openSignup();
    expect(googleButton()).toBeDisabled();
    expect(submitButton()).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox", { name: /Akceptuję/i }));
    await waitFor(() => expect(googleButton()).toBeEnabled());
    expect(submitButton()).toBeEnabled();

    await act(async () => {
      fireEvent.click(submitButton());
    });
    expect(signUpWithEmail).toHaveBeenCalledTimes(1);
  });

  it("wysylka bez zgody: blad przy jedynym checkboxie, fokus na nim, zaznaczenie zdejmuje blad", async () => {
    await openSignup();
    const form = screen.getByLabelText("E-mail").closest("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(signUpWithEmail).not.toHaveBeenCalled();
    const checkbox = screen.getByRole("checkbox", { name: /Akceptuję/i });
    expect(screen.getByRole("alert")).toHaveTextContent(TERMS_ERROR_MESSAGE);
    expect(checkbox).toHaveAttribute("aria-invalid", "true");
    expect(checkbox).toHaveAttribute("aria-describedby", "auth-error");
    expect(document.activeElement).toBe(checkbox);

    fireEvent.click(checkbox);
    await waitFor(() => expect(screen.queryByText(TERMS_ERROR_MESSAGE)).toBeNull());
    expect(checkbox).not.toHaveAttribute("aria-invalid");
  });

  it("urzadzenie ze zgoda: logowanie bez checkboxa, rejestracja dalej pyta raz", async () => {
    window.localStorage.setItem(STORAGE_KEYS.TERMS_ACCEPTED, "2026-09-01T10:00:00.000Z");
    render(<AuthRequiredModal isOpen onClose={() => {}} onGoogleClick={onGoogleClick} />);
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.getByText(/Obowiązują/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Nie mam konta/ }));
    await screen.findByRole("heading", { name: "Załóż konto" });
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
    expect(screen.queryByText(/Obowiązują/)).toBeNull();
    // Google nie wymaga ponownej zgody od urzadzenia, ktore ja juz ma.
    expect(googleButton()).toBeEnabled();
  });
});
