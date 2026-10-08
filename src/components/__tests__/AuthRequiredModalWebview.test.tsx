import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import React from "react";
import AuthRequiredModal from "@/components/AuthRequiredModal";
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

vi.mock("@/contexts/PendingIntentContext", () => ({
  usePendingIntent: () => ({ markAuthAttempt: vi.fn(), setPendingIntent: vi.fn(), cancelPendingIntent: vi.fn() }),
}));

// Formularz e-mail montuje Turnstile — tu liczy sie tylko sciezka Google.
vi.mock("@/components/EmailAuthForm", () => ({
  default: () => <div data-testid="email-form-mock" />,
}));

const UA_FACEBOOK =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/450.0.0.38.108;FBLC/pl_PL]";

const onGoogleClick = vi.fn().mockResolvedValue(undefined);
const googleButton = () => screen.getByRole("button", { name: /Kontynuuj z Google/i });

describe("AF-7-059…062: logowanie Google w przegladarce wbudowanej w aplikacje", () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetTermsConsentMemory();
    onGoogleClick.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("webview: podpowiedz 'otworz w przegladarce', Google wylaczony nawet po zgodzie", async () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(UA_FACEBOOK);
    render(<AuthRequiredModal isOpen onClose={() => {}} onGoogleClick={onGoogleClick} />);

    const hint = screen.getByText(/Otwórz w przeglądarce/i);
    expect(hint).toBeInTheDocument();
    expect(googleButton()).toHaveAttribute("aria-describedby", hint.id);

    fireEvent.click(screen.getByLabelText(/Akceptuję/i));
    await act(async () => {
      fireEvent.click(googleButton());
    });

    expect(googleButton()).toBeDisabled();
    expect(onGoogleClick).not.toHaveBeenCalled();
    expect(screen.getByTestId("email-form-mock")).toBeInTheDocument();
  });

  it("zwykla przegladarka: bez podpowiedzi, Google dziala po zgodzie", async () => {
    render(<AuthRequiredModal isOpen onClose={() => {}} onGoogleClick={onGoogleClick} />);

    expect(screen.queryByText(/Otwórz w przeglądarce/i)).toBeNull();
    expect(googleButton()).not.toHaveAttribute("aria-describedby");

    fireEvent.click(screen.getByLabelText(/Akceptuję/i));
    await waitFor(() => expect(googleButton()).toBeEnabled());
    await act(async () => {
      fireEvent.click(googleButton());
    });

    expect(onGoogleClick).toHaveBeenCalledTimes(1);
  });
});
