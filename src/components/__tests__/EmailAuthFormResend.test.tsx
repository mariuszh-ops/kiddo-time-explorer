import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import EmailAuthForm from "@/components/EmailAuthForm";

// A1000-RESEND: „Wyślij link ponownie” na ekranie „Sprawdź skrzynkę” wysyłał
// /auth/v1/resend bez tokenu (widget znikał razem z formularzem) -> 400 captcha_failed.

// jsdom nie ma ResizeObservera, a Checkbox (Radix) go używa.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// Każde zamontowanie widgetu wydaje WŁASNY token (tok-1, tok-2, ...), chyba że
// `wydawajTokeny` = false — wtedy widget stoi i czeka (np. na klik w checkbox).
const widget = { montowania: 0, wydawajTokeny: true };

vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: React.forwardRef(
    (
      props: {
        onWidgetLoad?: () => void;
        onSuccess?: (token: string) => void;
      },
      ref: React.Ref<{ reset: () => void }>,
    ) => {
      React.useImperativeHandle(ref, () => ({ reset: () => {} }));
      React.useEffect(() => {
        widget.montowania += 1;
        props.onWidgetLoad?.();
        if (widget.wydawajTokeny) props.onSuccess?.(`tok-${widget.montowania}`);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <div data-testid="turnstile-mock" />;
    },
  ),
}));

const signUpWithEmail = vi.fn().mockResolvedValue(undefined);
const signInWithEmail = vi.fn().mockResolvedValue(undefined);
const resendConfirmation = vi.fn().mockResolvedValue(undefined);
const resetPassword = vi.fn().mockResolvedValue(undefined);

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ signUpWithEmail, signInWithEmail, resendConfirmation, resetPassword }),
}));

const VALID_PASSWORD = "Abcdefgh1!xy";

/** Rejestracja przez formularz -> ekran „Sprawdź skrzynkę”. */
const zarejestruj = async () => {
  render(<EmailAuthForm initialMode="signup" />);
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "rodzina@example.com" } });
  fireEvent.change(screen.getByLabelText("Hasło"), { target: { value: VALID_PASSWORD } });
  fireEvent.click(screen.getByRole("checkbox"));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Załóż konto" }));
  });
  expect(screen.getByText("Sprawdź skrzynkę")).toBeInTheDocument();
};

/** Odliczanie 60 s tyka co sekundę — każdy tik to osobny render. */
const przeczekajCooldown = () => {
  for (let i = 0; i < 61; i++) {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
};

describe("EmailAuthForm — „Wyślij link ponownie” po rejestracji (A1000-RESEND)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    widget.montowania = 0;
    widget.wydawajTokeny = true;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ekran potwierdzenia ma własny widget i wysyła resend z NOWYM tokenem", async () => {
    await zarejestruj();
    expect(signUpWithEmail).toHaveBeenCalledWith("rodzina@example.com", VALID_PASSWORD, "tok-1");
    expect(screen.getByTestId("turnstile-mock")).toBeInTheDocument();
    expect(widget.montowania).toBe(2);

    przeczekajCooldown();
    const przycisk = screen.getByRole("button", { name: "Wyślij link ponownie" });
    expect(przycisk).toBeEnabled();

    await act(async () => {
      fireEvent.click(przycisk);
    });
    expect(resendConfirmation).toHaveBeenCalledWith("rodzina@example.com", "tok-2");
    expect(screen.getByRole("status")).toHaveTextContent("Wysłaliśmy link ponownie.");
  });

  it("widget, który nie wydał tokenu: przycisk nieaktywny, resend nie wychodzi", async () => {
    render(<EmailAuthForm initialMode="signup" />);
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "rodzina@example.com" } });
    fireEvent.change(screen.getByLabelText("Hasło"), { target: { value: VALID_PASSWORD } });
    fireEvent.click(screen.getByRole("checkbox"));
    // Formularz dostał token (tok-1); widget ekranu potwierdzenia już go NIE wyda.
    widget.wydawajTokeny = false;
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Załóż konto" }));
    });
    expect(screen.getByText("Sprawdź skrzynkę")).toBeInTheDocument();

    przeczekajCooldown();
    const przycisk = screen.getByRole("button", { name: "Wyślij link ponownie" });
    expect(przycisk).toBeDisabled();
    await act(async () => {
      fireEvent.click(przycisk);
    });
    expect(resendConfirmation).not.toHaveBeenCalled();
  });

  it("ekran po resecie hasła nie ma widgetu ani przycisku ponownej wysyłki", async () => {
    render(<EmailAuthForm initialMode="reset" />);
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "rodzina@example.com" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Wyślij link do zmiany hasła" }));
    });
    expect(resetPassword).toHaveBeenCalledWith("rodzina@example.com", "tok-1");
    expect(screen.getByText("Sprawdź skrzynkę")).toBeInTheDocument();
    expect(screen.queryByTestId("turnstile-mock")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Wyślij link ponownie/ })).not.toBeInTheDocument();
  });
});
