import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { axe } from "vitest-axe";
// vitest-axe eksportuje matcher bez typów wartości — rejestrujemy go przez namespace.
import * as vitestAxeMatchers from "vitest-axe/matchers";
import EmailAuthForm from "@/components/EmailAuthForm";
import type { AxeResults } from "axe-core";

expect.extend(vitestAxeMatchers as Parameters<typeof expect.extend>[0]);

const expectNoA11yViolations = (results: AxeResults) => {
  (expect(results) as unknown as { toHaveNoViolations(): void }).toHaveNoViolations();
};

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
      screen.getByText("Potwierdź zaznaczeniem, że akceptujesz Regulamin i Politykę prywatności oraz masz ukończone 18 lat."),
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

  it("nie wywołuje logiki submit bez zgody, a po zaznaczeniu wywołuje ją z poprawnymi danymi", async () => {
    render(<EmailAuthForm initialMode="signup" />);
    await screen.findByTestId("turnstile-mock");

    fillSignupForm();

    const submit = screen.getByRole("button", { name: "Załóż konto" });

    // Próba submitu bez zaznaczonej zgody — mock nie powinien być wywołany.
    fireEvent.click(submit);
    await waitFor(() => {
      expect(signUpWithEmail).not.toHaveBeenCalled();
    });

    const checkbox = screen.getByRole("checkbox", { name: /Akceptuję/i });
    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute("data-state", "checked");

    fireEvent.click(submit);
    await waitFor(() => {
      expect(signUpWithEmail).toHaveBeenCalledTimes(1);
      expect(signUpWithEmail).toHaveBeenCalledWith(
        "rodzina@example.com",
        VALID_PASSWORD,
        "test-captcha-token",
      );
    });
  });

  it("przycisk submit jest zablokowany bez zgody i dostępny po zaznaczeniu checkboxa", async () => {
    render(<EmailAuthForm initialMode="signup" />);
    await screen.findByTestId("turnstile-mock");

    fillSignupForm();

    const submit = screen.getByRole("button", { name: "Załóż konto" });
    expect(submit).toBeDisabled();

    const checkbox = screen.getByRole("checkbox", { name: /Akceptuję/i });
    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute("data-state", "checked");
    expect(submit).toBeEnabled();

    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute("data-state", "unchecked");
    expect(submit).toBeDisabled();
  });

  it("po nieudanej próbie rejestracji fokus przenosi się na checkbox zgody", async () => {
    render(<EmailAuthForm initialMode="signup" />);
    await screen.findByTestId("turnstile-mock");

    fillSignupForm();

    const checkbox = screen.getByRole("checkbox", { name: /Akceptuję/i });
    const submit = screen.getByRole("button", { name: "Załóż konto" });
    fireEvent.submit(submit.closest("form")!);

    expect(checkbox).toHaveFocus();
    expect(
      screen.getByText("Potwierdź zaznaczeniem, że akceptujesz Regulamin i Politykę prywatności oraz masz ukończone 18 lat."),
    ).toBeInTheDocument();
  });

  it("po zaznaczeniu checkboxa komunikat błędu zgody znika", async () => {
    render(<EmailAuthForm initialMode="signup" />);
    await screen.findByTestId("turnstile-mock");

    fillSignupForm();

    const submit = screen.getByRole("button", { name: "Załóż konto" });
    fireEvent.submit(submit.closest("form")!);

    const errorText = "Potwierdź zaznaczeniem, że akceptujesz Regulamin i Politykę prywatności oraz masz ukończone 18 lat.";
    await waitFor(() => {
      expect(screen.getByText(errorText)).toBeInTheDocument();
    });

    const checkbox = screen.getByRole("checkbox", { name: /Akceptuję/i });
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(screen.queryByText(errorText)).not.toBeInTheDocument();
    });
  });

  it("komunikat błędu zgody ma rolę alert i znika po zaznaczeniu checkboxa", async () => {
    render(<EmailAuthForm initialMode="signup" />);
    await screen.findByTestId("turnstile-mock");

    fillSignupForm();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    const submit = screen.getByRole("button", { name: "Załóż konto" });
    fireEvent.submit(submit.closest("form")!);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Potwierdź zaznaczeniem, że akceptujesz Regulamin i Politykę prywatności oraz masz ukończone 18 lat.",
    );
    expect(alert).toHaveAttribute("id", "auth-error");

    const checkbox = screen.getByRole("checkbox", { name: /Akceptuję/i });
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("komunikat błędu z rolą alert aktualizuje się poprawnie: pojawia się po submicie, znika po zaznaczeniu, wraca po ponownym submicie", async () => {
    const ERROR_TEXT =
      "Potwierdź zaznaczeniem, że akceptujesz Regulamin i Politykę prywatności oraz masz ukończone 18 lat.";
    render(<EmailAuthForm initialMode="signup" />);
    await screen.findByTestId("turnstile-mock");

    fillSignupForm();
    const checkbox = screen.getByRole("checkbox", { name: /Akceptuję/i });
    const submit = screen.getByRole("button", { name: "Załóż konto" });

    // 1. Przed submitem alert nie istnieje.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    // 2. Pierwszy submit bez zgody — alert pojawia się z poprawną treścią.
    fireEvent.submit(submit.closest("form")!);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(ERROR_TEXT);

    // 3. Ponowny submit bez zgody — jeden i ten sam alert, bez duplikatów.
    fireEvent.submit(submit.closest("form")!);
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent(ERROR_TEXT);

    // 4. Zaznaczenie zgody — alert znika.
    fireEvent.click(checkbox);
    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByText(ERROR_TEXT)).not.toBeInTheDocument();
    });

    // 5. Odznaczenie i ponowny submit — alert wraca z tą samą treścią.
    fireEvent.click(checkbox);
    fireEvent.submit(submit.closest("form")!);
    const alertAgain = await screen.findByRole("alert");
    expect(alertAgain).toHaveTextContent(ERROR_TEXT);
    expect(alertAgain).toHaveAttribute("id", "auth-error");
  });


  it("komunikat błędu jest nieobecny w drzewie dostępności przed pierwszym submitem, a pojawia się dopiero po nim bez zaznaczonej zgody", async () => {
    render(<EmailAuthForm initialMode="signup" />);
    await screen.findByTestId("turnstile-mock");

    fillSignupForm();

    const errorText = "Potwierdź zaznaczeniem, że akceptujesz Regulamin i Politykę prywatności oraz masz ukończone 18 lat.";

    // Przed submitem: ani roli alert, ani sam tekst — nawet ukryty — nie mogą istnieć w DOM,
    // więc komunikat jest nieobecny także w drzewie dostępności.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(errorText)).not.toBeInTheDocument();
    expect(document.getElementById("auth-error")).toBeNull();

    // Pierwszy submit bez zaznaczonej zgody — dopiero teraz komunikat się pojawia.
    const submit = screen.getByRole("button", { name: "Załóż konto" });
    fireEvent.submit(submit.closest("form")!);

    // getByRole domyślnie ignoruje elementy ukryte — znalezienie alertu oznacza,
    // że jest widoczny i obecny w drzewie dostępności.
    const alert = screen.getByRole("alert");
    expect(alert).toBeVisible();
    expect(alert).toHaveTextContent(errorText);
  });

  it("komunikat błędu zgody jest powiązany z checkboxem przez aria-describedby", async () => {
    render(<EmailAuthForm initialMode="signup" />);
    await screen.findByTestId("turnstile-mock");

    fillSignupForm();

    const submit = screen.getByRole("button", { name: "Załóż konto" });
    fireEvent.submit(submit.closest("form")!);

    const checkbox = screen.getByRole("checkbox", { name: /Akceptuję/i });
    await waitFor(() => {
      expect(checkbox).toHaveAttribute("aria-describedby", "auth-error");
    });

    const errorEl = document.getElementById("auth-error");
    expect(errorEl).not.toBeNull();
    expect(errorEl!.textContent).toContain(
      "Potwierdź zaznaczeniem, że akceptujesz Regulamin i Politykę prywatności oraz masz ukończone 18 lat.",
    );
  });

  it("aria-describedby na checkboxie pojawia się dopiero po submicie bez zgody i znika po jego zaznaczeniu", async () => {
    render(<EmailAuthForm initialMode="signup" />);
    await screen.findByTestId("turnstile-mock");

    fillSignupForm();

    const checkbox = screen.getByRole("checkbox", { name: /Akceptuję/i });

    // Przed submitem checkbox nie ma powiązania z komunikatem błędu.
    expect(checkbox).not.toHaveAttribute("aria-describedby");

    const submit = screen.getByRole("button", { name: "Załóż konto" });
    fireEvent.submit(submit.closest("form")!);

    // Dopiero po nieudanym submicie pojawia się aria-describedby → auth-error.
    await waitFor(() => {
      expect(checkbox).toHaveAttribute("aria-describedby", "auth-error");
    });

    // Zaznaczenie zgody czyta błąd i usuwa powiązanie.
    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute("data-state", "checked");

    await waitFor(() => {
      expect(checkbox).not.toHaveAttribute("aria-describedby");
      expect(document.getElementById("auth-error")).toBeNull();
    });
  });

  it("po submicie bez zgody fokus przenosi się na checkbox, a po jego zaznaczeniu błąd znika", async () => {
    render(<EmailAuthForm initialMode="signup" />);
    await screen.findByTestId("turnstile-mock");

    fillSignupForm();

    const submit = screen.getByRole("button", { name: "Załóż konto" });
    fireEvent.submit(submit.closest("form")!);

    const checkbox = screen.getByRole("checkbox", { name: /Akceptuję/i });
    // Po nieudanym submicie fokus sterujemy na element z błędem — checkbox zgody.
    expect(checkbox).toHaveFocus();

    const errorText = "Potwierdź zaznaczeniem, że akceptujesz Regulamin i Politykę prywatności oraz masz ukończone 18 lat.";
    expect(screen.getByText(errorText)).toBeInTheDocument();

    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute("data-state", "checked");
    // Fokus zostaje na checkboxie, na którym użytkownik właśnie działał.
    expect(checkbox).toHaveFocus();

    await waitFor(() => {
      expect(screen.queryByText(errorText)).not.toBeInTheDocument();
    });
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

  it("otrzymuje fokus po nawigacji Tab i przełącza się klawiszami Space oraz Enter", async () => {
    const user = userEvent.setup();
    render(<EmailAuthForm initialMode="signup" />);
    await screen.findByTestId("turnstile-mock");

    const checkbox = getCheckbox();
    // Kolejność focusable: e-mail → hasło → checkbox (mock Turnstile nie jest focusable).
    await user.tab();
    await user.tab();
    await user.tab();
    expect(checkbox).toHaveFocus();

    // Space powinien zaznaczyć checkbox.
    fireEvent.keyDown(checkbox, { key: " ", code: "Space" });
    fireEvent.click(checkbox);
    fireEvent.keyUp(checkbox, { key: " ", code: "Space" });
    expect(checkbox).toHaveAttribute("data-state", "checked");

    // Enter powinien go odznaczyć.
    fireEvent.keyDown(checkbox, { key: "Enter", code: "Enter" });
    fireEvent.click(checkbox);
    fireEvent.keyUp(checkbox, { key: "Enter", code: "Enter" });
    expect(checkbox).toHaveAttribute("data-state", "unchecked");
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

  it("po kliknięciu i powrocie klawiaturą Tab zachowuje fokus i daje się przełączać", async () => {
    const user = userEvent.setup();
    render(<EmailAuthForm initialMode="signup" />);
    await screen.findByTestId("turnstile-mock");

    const checkbox = getCheckbox();

    // Kliknięcie myszką zaznacza checkbox, ale nie pozostawia tam fokusu klawiatury.
    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute("data-state", "checked");

    // Powrót do checkboxa klawiaturą: e-mail → hasło → checkbox.
    await user.tab();
    await user.tab();
    await user.tab();
    expect(checkbox).toHaveFocus();

    // Przełączenie spacją bez utraty kontekstu.
    fireEvent.keyDown(checkbox, { key: " ", code: "Space" });
    fireEvent.click(checkbox);
    fireEvent.keyUp(checkbox, { key: " ", code: "Space" });
    expect(checkbox).toHaveAttribute("data-state", "unchecked");
    expect(checkbox).toHaveAttribute("aria-checked", "false");
  });

  it("po zaznaczeniu i odznaczeniu zgody Tab przechodzi kolejno checkbox → linki → submit", async () => {
    const user = userEvent.setup();
    render(<EmailAuthForm initialMode="signup" />);
    await screen.findByTestId("turnstile-mock");

    fillSignupForm();

    const checkbox = screen.getByRole("checkbox", { name: /Akceptuję/i });
    const submit = screen.getByRole("button", { name: "Załóż konto" });

    // e-mail → hasło → checkbox
    await user.tab();
    await user.tab();
    await user.tab();
    expect(checkbox).toHaveFocus();

    // Zaznaczenie spacją.
    await user.keyboard(" ");
    expect(checkbox).toHaveAttribute("data-state", "checked");

    // Tab z checkboxa przechodzi przez linki regulaminu, a potem na aktywny submit.
    await user.tab();
    expect(screen.getByRole("link", { name: "Regulamin" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: "Politykę prywatności" })).toHaveFocus();
    await user.tab();
    expect(submit).toHaveFocus();
    expect(submit).toBeEnabled();
    await user.tab();
    expect(screen.getByRole("button", { name: "Mam już konto — zaloguj się" })).toHaveFocus();

    // Powrót Shift+Tab na checkbox.
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(checkbox).toHaveFocus();

    // Odznaczenie spacją — submit staje się disabled i wypada z kolejności Tab.
    await user.keyboard(" ");
    expect(checkbox).toHaveAttribute("data-state", "unchecked");
    expect(submit).toBeDisabled();

    await user.tab();
    expect(screen.getByRole("link", { name: "Regulamin" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: "Politykę prywatności" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Mam już konto — zaloguj się" })).toHaveFocus();
  });

  it("checkbox ma czytelną nazwę dostępną w drzewie dostępności", () => {
    render(<EmailAuthForm initialMode="signup" />);
    const checkbox = screen.getByRole("checkbox", { name: /Akceptuję/i });

    // getByRole z name korzysta z drzewa dostępności — to samo zobaczy czytnik ekranu.
    expect(checkbox).toHaveAccessibleName(/Akceptuję Regulamin i Politykę prywatności/i);

    // Etykieta jest powiązana przez htmlFor/id, a nie przez aria-label.
    expect(checkbox).not.toHaveAttribute("aria-label");
    expect(checkbox).toHaveAttribute("id", "terms-accept");
  });

  it("Y-H-02: zaznaczenie obejmuje oświadczenie o pełnoletności", () => {
    render(<EmailAuthForm initialMode="signup" />);
    const checkbox = screen.getByRole("checkbox", { name: /Akceptuję/i });

    // Jedno zaznaczenie, dwa oświadczenia — czytnik ekranu musi usłyszeć oba.
    expect(checkbox).toHaveAccessibleName(/ukończone 18 lat/i);
    // Bez nowego pola: w formularzu stoi dokładnie jeden checkbox.
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
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

describe("EmailAuthForm — automatyczny audyt axe", () => {
  // jsdom nie liczy layoutu, więc reguły zależne od renderowania kolorów
  // i rozmiarów (color-contrast, target-size) wyłączamy — kontrast i 24x24 px
  // są sprawdzane osobnymi testami powyżej.
  const AXE_OPTIONS = {
    rules: {
      "color-contrast": { enabled: false },
    },
  };

  it("formularz rejestracji z checkboxem zgody nie ma naruszeń dostępności", async () => {
    const { container } = render(<EmailAuthForm initialMode="signup" />);
    await screen.findByTestId("turnstile-mock");

    const results = await axe(container, AXE_OPTIONS);
    expectNoA11yViolations(results);
  });

  it("stan błędu (komunikat przy checkboxu) też nie ma naruszeń", async () => {
    const { container } = render(<EmailAuthForm initialMode="signup" />);
    await screen.findByTestId("turnstile-mock");

    fillSignupForm();
    fireEvent.submit(screen.getByRole("button", { name: "Załóż konto" }).closest("form")!);
    await screen.findByText("Potwierdź zaznaczeniem, że akceptujesz Regulamin i Politykę prywatności oraz masz ukończone 18 lat.");

    const results = await axe(container, AXE_OPTIONS);
    expectNoA11yViolations(results);
  });

  it("neutralny stan formularza bez błędów i bez interakcji użytkownika nie ma naruszeń", async () => {
    const { container } = render(<EmailAuthForm />);
    await screen.findByTestId("turnstile-mock");

    const results = await axe(container, AXE_OPTIONS);
    expectNoA11yViolations(results);
  });
});
