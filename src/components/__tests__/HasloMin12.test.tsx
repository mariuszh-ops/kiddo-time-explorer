import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import EmailAuthForm from "@/components/EmailAuthForm";
import ResetPassword from "@/pages/ResetPassword";
import {
  checkPassword,
  passwordErrorMessage,
  PASSWORD_HINT,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
} from "@/lib/passwordPolicy";
import { translateAuthError } from "@/lib/authErrors";

// AN-5-135 (ASVS V2.1.1): nowe hasła (rejestracja, reset, zmiana) mają mieć min. 12 znaków,
// a teksty w formularzach mają to mówić. Logowanie NIE sprawdza długości — stare konta
// z hasłem 8–11 znaków muszą dalej się logować.

const HASLO_11 = "Rodzina26!x";
const HASLO_12 = "Rodzina26!xy";
const STARE_HASLO_8 = "Abcdef1!";

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

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
const signInWithEmail = vi.fn().mockResolvedValue(undefined);
const resendConfirmation = vi.fn().mockResolvedValue(undefined);
const resetPassword = vi.fn().mockResolvedValue(undefined);

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ signUpWithEmail, signInWithEmail, resendConfirmation, resetPassword }),
}));

const updateUser = vi.fn(async () => ({ error: null }));
vi.mock("@/lib/catalogClient", () => ({
  catalogClient: {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "u1" } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      updateUser: (...a: unknown[]) => updateUser(...(a as [])),
    },
  },
}));
vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
vi.mock("@/components/SEOHead", () => ({ default: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AN-5-135: polityka hasła — min. 12 znaków", () => {
  it("11 znaków nie spełnia długości, 12 spełnia wszystkie reguły", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(12);
    expect(checkPassword(HASLO_11)).toMatchObject({ ok: false, minLength: false });
    expect(checkPassword(HASLO_12).ok).toBe(true);
    expect(passwordErrorMessage(HASLO_11)).toBe("Hasło musi mieć co najmniej 12 znaków.");
  });

  it("teksty mówią o 12 znakach (podpowiedź, lista wymagań, błąd serwera)", () => {
    expect(PASSWORD_HINT).toMatch(/^min\. 12 znaków/);
    expect(PASSWORD_RULES[0].label).toBe("Co najmniej 12 znaków");
    expect(translateAuthError(new Error("Password should be at least 12 characters."))).toContain("min. 12 znaków");
  });
});

describe("AN-5-135: EmailAuthForm", () => {
  it("rejestracja: hasło 11 znaków jest odrzucane przed wysyłką", async () => {
    render(<EmailAuthForm initialMode="signup" />);
    await screen.findByTestId("turnstile-mock");
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "rodzina@example.com" } });
    fireEvent.change(screen.getByLabelText("Hasło"), { target: { value: HASLO_11 } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Akceptuję/i }));

    expect(screen.getByLabelText("Hasło")).toHaveAttribute("placeholder", PASSWORD_HINT);
    expect(screen.getByRole("button", { name: "Załóż konto" })).toBeDisabled();
    fireEvent.submit(screen.getByRole("button", { name: "Załóż konto" }).closest("form")!);
    expect(signUpWithEmail).not.toHaveBeenCalled();
    expect(screen.getByText("Hasło musi mieć co najmniej 12 znaków.")).toBeInTheDocument();
  });

  it("rejestracja: hasło 12 znaków przechodzi", async () => {
    render(<EmailAuthForm initialMode="signup" />);
    await screen.findByTestId("turnstile-mock");
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "rodzina@example.com" } });
    fireEvent.change(screen.getByLabelText("Hasło"), { target: { value: HASLO_12 } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Akceptuję/i }));
    fireEvent.click(screen.getByRole("button", { name: "Załóż konto" }));
    await waitFor(() =>
      expect(signUpWithEmail).toHaveBeenCalledWith("rodzina@example.com", HASLO_12, "test-captcha-token"),
    );
  });

  it("logowanie: stare hasło 8 znaków dalej trafia do logowania (bez walidacji długości)", async () => {
    render(<EmailAuthForm initialMode="signin" />);
    await screen.findByTestId("turnstile-mock");
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "rodzina@example.com" } });
    fireEvent.change(screen.getByLabelText("Hasło"), { target: { value: STARE_HASLO_8 } });
    fireEvent.click(screen.getByRole("button", { name: "Zaloguj się" }));
    await waitFor(() =>
      expect(signInWithEmail).toHaveBeenCalledWith("rodzina@example.com", STARE_HASLO_8, "test-captcha-token"),
    );
    expect(screen.queryByText(/co najmniej 12 znaków/)).not.toBeInTheDocument();
  });
});

describe("AN-5-135: ResetPassword", () => {
  const renderuj = () =>
    render(
      <MemoryRouter initialEntries={["/reset-password"]}>
        <ResetPassword />
      </MemoryRouter>,
    );

  it("nowe hasło 11 znaków: przycisk nieaktywny, wymuszona wysyłka nie woła updateUser", async () => {
    renderuj();
    const pole = await screen.findByLabelText("Nowe hasło");
    expect(pole).toHaveAttribute("placeholder", PASSWORD_HINT);
    fireEvent.change(pole, { target: { value: HASLO_11 } });
    const przycisk = screen.getByRole("button", { name: "Zapisz nowe hasło" });
    expect(przycisk).toBeDisabled();
    fireEvent.submit(przycisk.closest("form")!);
    expect(await screen.findByRole("alert")).toHaveTextContent("Hasło musi mieć co najmniej 12 znaków.");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("nowe hasło 12 znaków trafia do updateUser", async () => {
    renderuj();
    const pole = await screen.findByLabelText("Nowe hasło");
    fireEvent.change(pole, { target: { value: HASLO_12 } });
    fireEvent.click(screen.getByRole("button", { name: "Zapisz nowe hasło" }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ password: HASLO_12 }));
  });
});
