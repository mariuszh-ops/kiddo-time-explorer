import { useEffect, useRef, useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";
import { translateAuthError, isEmailRateLimitError } from "@/lib/authErrors";
import { passwordErrorMessage, checkPassword, PASSWORD_HINT } from "@/lib/passwordPolicy";
import PasswordRequirements from "@/components/PasswordRequirements";
import {
  TURNSTILE_SITE_KEY,
  TURNSTILE_ERROR_MESSAGE,
  TURNSTILE_BLOCKED_MESSAGE,
  TURNSTILE_OUR_FAULT_MESSAGE,
  turnstileUnavailableMessage,
  isCaptchaError,
} from "@/lib/turnstile";


type Mode = "signin" | "signup" | "reset";

interface EmailAuthFormProps {
  /** Wywoływane po udanym zalogowaniu e-mailem. */
  onSuccess?: () => void;
  /** Informuje rodzica o zmianie trybu (logowanie / rejestracja / reset). */
  onModeChange?: (mode: Mode) => void;
  /** Startowy adres e-mail (np. przy ponawianiu linku potwierdzającego). */
  initialEmail?: string;
  /** Startowy tryb formularza. */
  initialMode?: Mode;
}

// M-14: serwer (GoTrue smtp_max_frequency) nie wyśle drugiego maila przez 60 s —
// krótszy cooldown w UI tylko zaprasza do kliknięcia, które skończy się 429.
const RESEND_COOLDOWN = 60;
// D-15: budżet liczony od otwarcia formularza do WYRENDEROWANIA widgetu.
// Po wyrenderowaniu nie ma limitu — czekamy na kliknięcie użytkownika.
const TURNSTILE_TIMEOUT_MS = 15000;

/** Tyle, ile sprawdza przegladarka dla type="email" — bez pretensji do RFC. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


const EmailAuthForm = ({ onSuccess, onModeChange, initialEmail = "", initialMode = "signin" }: EmailAuthFormProps) => {
  const { signInWithEmail, signUpWithEmail, resendConfirmation, resetPassword } = useAuth();
  const [mode, setModeState] = useState<Mode>(initialMode);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** K-13: ktore pole obwiniamy — steruje aria-invalid i fokusem po submicie. */
  const [errorField, setErrorField] = useState<"email" | "password" | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [screen, setScreen] = useState<"form" | "confirm" | "reset-sent">("form");
  const [cooldown, setCooldown] = useState(0);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState(false);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const captchaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** D-15: widget stoi na stronie i czeka na kliknięcie — to NIE jest awaria. */
  const widgetReadyRef = useRef(false);

  /** Token Turnstile jest jednorazowy — po każdej nieudanej próbie resetujemy widget. */
  const resetCaptcha = () => {
    setCaptchaToken("");
    setCaptchaError(false);
    turnstileRef.current?.reset();
  };

  const clearCaptchaTimeout = () => {
    if (captchaTimeoutRef.current) {
      clearTimeout(captchaTimeoutRef.current);
      captchaTimeoutRef.current = null;
    }
  };

  /**
   * Zablokuj logowanie hasłem, gdy widget nie wystartuje.
   * I-09: treść zależy od tego, czy skrypt Cloudflare w ogóle się wczytał —
   * nie obwiniamy rozszerzeń użytkownika, gdy wina jest po naszej stronie.
   */
  const markCaptchaUnavailable = () => {
    clearCaptchaTimeout();
    setCaptchaError(true);
    setError(turnstileUnavailableMessage());
  };


  const setMode = (next: Mode) => {
    setModeState(next);
    setErrorField(null);
    onModeChange?.(next);
  };

  useEffect(() => {
    onModeChange?.(initialMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    // Jeśli widget Turnstile nie zdąży się WYRENDEROWAĆ (adblock/filtr DNS/awaria),
    // traktujemy to jako awarię zabezpieczenia i blokujemy logowanie hasłem.
    // D-15: gdy widget stoi na stronie i czeka na kliknięcie checkboxa, budżet
    // nie ma prawa go ubić — użytkownik dostaje tyle czasu, ile potrzebuje.
    captchaTimeoutRef.current = setTimeout(() => {
      if (!captchaToken && !widgetReadyRef.current) {
        markCaptchaUnavailable();
      }
    }, TURNSTILE_TIMEOUT_MS);

    return clearCaptchaTimeout;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setErrorField(null);
    setInfo(null);

    // K-13: `noValidate` na formularzu wylacza angielski dymek przegladarki,
    // wiec format adresu sprawdzamy sami i po polsku.
    const failEmail = (message: string) => {
      setError(message);
      setErrorField("email");
      emailRef.current?.focus();
    };
    const failPassword = (message: string) => {
      setError(message);
      setErrorField("password");
      passwordRef.current?.focus();
    };

    if (!email.trim()) {
      failEmail("Podaj adres e-mail.");
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      failEmail("Podaj poprawny adres e-mail, np. rodzina@example.com.");
      return;
    }
    // Siłę hasła walidujemy tylko przy zakładaniu konta — stare konta
    // mają krótsze hasła i muszą móc się zalogować.
    if (mode === "signup") {
      const pwdError = passwordErrorMessage(password);
      if (pwdError) {
        failPassword(pwdError);
        return;
      }
    } else if (mode === "signin" && !password) {
      failPassword("Podaj hasło.");
      return;
    }
    // Bez tokenu nie wysyłamy nic — także wtedy, gdy widget zgłosił awarię
    // (wcześniej `captchaError` przepuszczał żądanie z pustym tokenem).
    if (!captchaToken) {
      setError(captchaError ? turnstileUnavailableMessage() : TURNSTILE_ERROR_MESSAGE);
      return;
    }

    setBusy(true);
    try {
      if (mode === "reset") {
        await resetPassword(email, captchaToken);
        setScreen("reset-sent");
      } else if (mode === "signup") {
        await signUpWithEmail(email, password, captchaToken);
        trackEvent("signup", { method: "email" });
        setScreen("confirm");
        setCooldown(RESEND_COOLDOWN);
      } else {
        await signInWithEmail(email, password, captchaToken);
        trackEvent("login", { method: "email" });
        onSuccess?.();
      }
      setCaptchaToken("");
      turnstileRef.current?.reset();
    } catch (err) {
      if (captchaError) {
        setError(turnstileUnavailableMessage());
      } else {
        setError(isCaptchaError(err) ? TURNSTILE_ERROR_MESSAGE : translateAuthError(err));
      }
      resetCaptcha();
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (busy || cooldown > 0) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await resendConfirmation(email, captchaToken || undefined);
      setInfo("Wysłaliśmy link ponownie.");
      setCooldown(RESEND_COOLDOWN);
      setCaptchaToken("");
      turnstileRef.current?.reset();
    } catch (err) {
      // M-14: limit serwera to konkretna odpowiedź — tłumaczymy ją nawet wtedy,
      // gdy widget captchy zdążył zgłosić awarię.
      if (isEmailRateLimitError(err)) {
        setError(translateAuthError(err));
        setCooldown(RESEND_COOLDOWN);
      } else if (captchaError) {
        setError(turnstileUnavailableMessage());
      } else {
        setError(isCaptchaError(err) ? TURNSTILE_ERROR_MESSAGE : translateAuthError(err));
      }
      resetCaptcha();
    } finally {
      setBusy(false);
    }
  };


  if (screen === "confirm" || screen === "reset-sent") {
    const isConfirm = screen === "confirm";
    return (
      <div className="flex flex-col items-center text-center gap-3 py-2">
        <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
          <MailCheck className="w-6 h-6 text-accent-foreground" />
        </div>
        <p className="font-serif text-base text-foreground">
          {isConfirm ? "Sprawdź skrzynkę" : "Sprawdź skrzynkę"}
        </p>
        <p className="text-sm text-muted-foreground">
          {isConfirm ? "Wysłaliśmy link potwierdzający na " : "Wysłaliśmy link do zmiany hasła na "}
          <span className="font-medium text-foreground break-all">{email}</span>.
          {isConfirm && " Kliknij go, aby aktywować konto."}
        </p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {info && <p role="status" className="text-sm text-muted-foreground">{info}</p>}
        <div className="flex flex-col gap-2 w-full pt-1">
          {isConfirm && (
            <Button variant="outline" onClick={resend} disabled={busy || cooldown > 0} className="w-full">
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : cooldown > 0 ? (
                `Wyślij link ponownie (${cooldown} s)`
              ) : (
                "Wyślij link ponownie"
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              setScreen("form");
              setMode("signin");
              setError(null);
              setInfo(null);
            }}
            className="w-full"
          >
            Wróć do logowania
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="auth-email">E-mail</Label>
        <Input
          id="auth-email"
          ref={emailRef}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="rodzina@example.com"
          aria-invalid={errorField === "email" || undefined}
          aria-describedby={errorField === "email" ? "auth-error" : undefined}
        />
      </div>

      {mode !== "reset" && (
        <div className="space-y-1.5">
          <Label htmlFor="auth-password">Hasło</Label>
          <Input
            id="auth-password"
            ref={passwordRef}
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? PASSWORD_HINT : "Twoje hasło"}
            aria-invalid={errorField === "password" || undefined}
            aria-describedby={errorField === "password" ? "auth-error" : undefined}
          />
          {mode === "signup" && <PasswordRequirements password={password} />}
        </div>
      )}

      <div className="flex justify-center">
        <Turnstile
          ref={turnstileRef}
          siteKey={TURNSTILE_SITE_KEY}
          onWidgetLoad={() => {
            // D-15: widget jest na stronie — dalej to już tylko czekanie na użytkownika.
            widgetReadyRef.current = true;
            clearCaptchaTimeout();
          }}
          onSuccess={(token) => {
            widgetReadyRef.current = true;
            clearCaptchaTimeout();
            setCaptchaToken(token);
            setCaptchaError(false);
            setError((prev) => (prev === TURNSTILE_BLOCKED_MESSAGE || prev === TURNSTILE_OUR_FAULT_MESSAGE ? null : prev));
          }}
          onExpire={() => setCaptchaToken("")}
          onError={() => {
            markCaptchaUnavailable();
          }}
          onUnsupported={() => {
            markCaptchaUnavailable();
          }}
          scriptOptions={{
            onError: () => {
              markCaptchaUnavailable();
            },
          }}
          options={{ size: "flexible" }}
        />
      </div>

      {error && (
        <p id="auth-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-1 px-1 pb-1 pt-2 bg-background">
      <Button
        type="submit"
        disabled={
          busy ||
          !captchaToken ||
          (mode === "signup" && !checkPassword(password).ok)
        }
        className="w-full"
      >

        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : mode === "reset" ? (
          "Wyślij link do zmiany hasła"
        ) : mode === "signup" ? (
          "Załóż konto"
        ) : (
          "Zaloguj się"
        )}
      </Button>
      </div>


      <div className="flex items-center justify-between gap-2 text-sm">
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setError(null);
          }}
          className="text-primary hover:underline min-h-11 flex items-center"
        >
          {mode === "signup" ? "Mam już konto — zaloguj się" : "Nie mam konta — załóż konto"}
        </button>
        {mode !== "reset" && (
          <button
            type="button"
            onClick={() => {
              setMode("reset");
              setError(null);
            }}
            className="text-muted-foreground hover:text-foreground hover:underline min-h-11 flex items-center"
          >
            Nie pamiętam hasła
          </button>
        )}
        {mode === "reset" && (
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
            }}
            className="text-muted-foreground hover:text-foreground hover:underline min-h-11 flex items-center"
          >
            Wróć
          </button>
        )}
      </div>
    </form>
  );
};

export default EmailAuthForm;
