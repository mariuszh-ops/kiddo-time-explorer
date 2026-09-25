import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import AuthLinkErrorHandler from "@/components/AuthLinkErrorHandler";

// Captcha zawsze od razu zwraca token — testujemy drogę do logowania, nie Turnstile.
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
        props.onWidgetLoad?.();
        props.onSuccess?.("test-captcha-token");
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <div data-testid="turnstile-mock" />;
    },
  ),
}));

const resendConfirmation = vi.fn().mockResolvedValue(undefined);
const signInWithGoogle = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ resendConfirmation, signInWithGoogle }),
}));

// Modal logowania ma własne testy (historia, zgoda) — tu liczy się tylko, czy się otwiera.
vi.mock("@/components/AuthRequiredModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="modal-logowania" /> : null,
}));

const PRZED = /Twoje konto może być już aktywne — wtedy nowy link nie przyjdzie/;
const PO = /Jeśli mail nie dotrze w ciągu kilku minut, spróbuj się zalogować/;

const otworzWygaslyLink = () => {
  window.history.replaceState(
    null,
    "",
    "/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
  );
  render(<AuthLinkErrorHandler />);
};

describe("AuthLinkErrorHandler — A1000-T3: konto mogło zostać już aktywowane", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("przed wysyłką pokazuje zdanie o aktywnym koncie i przycisk logowania", async () => {
    otworzWygaslyLink();
    await screen.findByTestId("turnstile-mock");

    expect(screen.getByText(PRZED)).toBeInTheDocument();
    expect(screen.queryByText(PO)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zaloguj się" })).toBeInTheDocument();
  });

  it("przycisk Zaloguj się zamyka dialog i otwiera logowanie bez żadnego zapytania", async () => {
    otworzWygaslyLink();
    await screen.findByTestId("turnstile-mock");

    fireEvent.click(screen.getByRole("button", { name: "Zaloguj się" }));

    expect(await screen.findByTestId("modal-logowania")).toBeInTheDocument();
    expect(screen.queryByText("Ten link wygasł lub został już użyty")).not.toBeInTheDocument();
    // Enumeracja: front nie pyta serwera, czy konto istnieje.
    expect(resendConfirmation).not.toHaveBeenCalled();
  });

  it("po wysyłce zdanie o braku maila i przycisk logowania zostają na ekranie", async () => {
    otworzWygaslyLink();
    await screen.findByTestId("turnstile-mock");

    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "rodzina@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Wyślij nowy link" }));

    await waitFor(() =>
      expect(resendConfirmation).toHaveBeenCalledWith("rodzina@example.com", "test-captcha-token"),
    );
    expect(await screen.findByText(PO)).toBeInTheDocument();
    expect(screen.queryByText(PRZED)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Zaloguj się" }));
    expect(await screen.findByTestId("modal-logowania")).toBeInTheDocument();
  });
});
