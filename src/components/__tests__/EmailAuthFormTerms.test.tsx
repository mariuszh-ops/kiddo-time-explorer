import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import EmailAuthForm from "@/components/EmailAuthForm";

// jsdom nie ma ResizeObservera, a Checkbox (Radix) go używa.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// Captcha zawsze od razu zwraca token — testujemy zgode, nie Turnstile.
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

const signUpWithEmail = vi.fn().mockResolvedValue(undefined);
const signInWithEmail = vi.fn().mockResolvedValue(undefined);
const resendConfirmation = vi.fn().mockResolvedValue(undefined);
const resetPassword = vi.fn().mockResolvedValue(undefined);

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ signUpWithEmail, signInWithEmail, resendConfirmation, resetPassword }),
}));

const VALID_PASSWORD = "Abcdef1!";

const fillSignupForm = () => {
  fireEvent.change(screen.getByLabelText("E-mail"), {
    target: { value: "rodzina@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Hasło"), {
    target: { value: VALID_PASSWORD },
  });
};

describe("EmailAuthForm — zgoda na regulamin (signup)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bez zaznaczonego checkboxa przycisk jest nieaktywny i formularz nie wysyła się", async () => {
    render(<EmailAuthForm initialMode="signup" />);
    await screen.findByTestId("turnstile-mock");

    fillSignupForm();

    const submit = screen.getByRole("button", { name: "Załóż konto" });
    expect(submit).toBeDisabled();

    // Nawet wymuszone submit (np. Enter w polu) nie może wysłać formularza.
    fireEvent.submit(submit.closest("form")!);
    expect(signUpWithEmail).not.toHaveBeenCalled();
    expect(
      screen.getByText("Zaznacz zgodę na Regulamin i Politykę prywatności, aby założyć konto."),
    ).toBeInTheDocument();
  });

  it("po zaznaczeniu checkboxa formularz wysyła się poprawnie", async () => {
    render(<EmailAuthForm initialMode="signup" />);
    await screen.findByTestId("turnstile-mock");

    fillSignupForm();

    const checkbox = screen.getByRole("checkbox", { name: /Akceptuję/i });
    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute("data-state", "checked");

    const submit = screen.getByRole("button", { name: "Załóż konto" });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    await waitFor(() => {
      expect(signUpWithEmail).toHaveBeenCalledWith(
        "rodzina@example.com",
        VALID_PASSWORD,
        "test-captcha-token",
      );
    });
    expect(await screen.findByText("Sprawdź skrzynkę")).toBeInTheDocument();
  });

  it("checkbox nie występuje w trybach logowania i resetu hasła", () => {
    const { unmount } = render(<EmailAuthForm initialMode="signin" />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    unmount();

    render(<EmailAuthForm initialMode="reset" />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});

describe("EmailAuthForm — dostępność checkboxa zgody", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const getCheckbox = () => screen.getByRole("checkbox", { name: /Akceptuję/i });

  it("jest osiągalny klawiaturą (tabindex 0) i przełączany spacją", () => {
    render(<EmailAuthForm initialMode="signup" />);
    const checkbox = getCheckbox();

    expect(checkbox).toHaveAttribute("tabindex", "0");
    expect(checkbox).not.toBeDisabled();

    checkbox.focus();
    expect(checkbox).toHaveFocus();

    // jsdom nie odwzorowuje domyślnej akcji spacji na przycisku, więc obok
    // zdarzeń klawiatury wywołujemy click, który przeglądarka wysyła sama.
    fireEvent.keyDown(checkbox, { key: " ", code: "Space" });
    fireEvent.click(checkbox);
    fireEvent.keyUp(checkbox, { key: " ", code: "Space" });
    expect(checkbox).toHaveAttribute("data-state", "checked");
  });

  it("ma poprawne atrybuty ARIA i etykietę powiązaną przez htmlFor", () => {
    render(<EmailAuthForm initialMode="signup" />);
    const checkbox = getCheckbox();

    expect(checkbox).toHaveAttribute("role", "checkbox");
    expect(checkbox).toHaveAttribute("aria-required", "true");
    expect(checkbox).toHaveAttribute("aria-checked", "false");
    expect(checkbox).toHaveAttribute("id", "terms-accept");

    const label = document.querySelector('label[for="terms-accept"]');
    expect(label).not.toBeNull();
    expect(label!.textContent).toContain("Akceptuję");

    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute("aria-checked", "true");
  });

  it("etykieta jest powiązana z checkboxem przez htmlFor i kliknięcie tekstu go przełącza", () => {
    render(<EmailAuthForm initialMode="signup" />);

    const checkbox = screen.getByLabelText((content) =>
      content.includes("Akceptuję") && content.includes("Regulamin") && content.includes("Politykę prywatności"),
    );
    expect(checkbox).toHaveAttribute("role", "checkbox");
    expect(checkbox).toHaveAttribute("data-state", "unchecked");

    const label = document.querySelector('label[for="terms-accept"]')!;
    expect(label).not.toBeNull();
    fireEvent.click(label);

    expect(checkbox).toHaveAttribute("data-state", "checked");
    expect(checkbox).toHaveAttribute("aria-checked", "true");
  });

  it("ma obszar kliknięcia min. 24x24 px (WCAG 2.5.8)", () => {
    render(<EmailAuthForm initialMode="signup" />);
    const checkbox = getCheckbox();

    // h-6 w-6 = 1.5rem = 24 px w skali domyślnej.
    expect(checkbox.className).toMatch(/\bh-6\b/);
    expect(checkbox.className).toMatch(/\bw-6\b/);
  });

  it("kliknięcie linków w etykiecie nie przełącza zgody", () => {
    render(<EmailAuthForm initialMode="signup" />);
    const checkbox = getCheckbox();

    fireEvent.click(screen.getByRole("link", { name: "Regulamin" }));
    fireEvent.click(screen.getByRole("link", { name: "Politykę prywatności" }));

    expect(checkbox).toHaveAttribute("data-state", "unchecked");
  });

  it("linki zgody otwierają się w nowej karcie z rel=noopener", () => {
    render(<EmailAuthForm initialMode="signup" />);
    for (const name of ["Regulamin", "Politykę prywatności"]) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
    }
  });
});
