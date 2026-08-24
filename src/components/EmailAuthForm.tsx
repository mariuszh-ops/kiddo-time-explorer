import { useEffect, useRef, useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { translateAuthError, isEmailRateLimitError } from "@/lib/authErrors";
import { TURNSTILE_SITE_KEY, TURNSTILE_ERROR_MESSAGE, TURNSTILE_UNAVAILABLE_MESSAGE, isCaptchaError } from "@/lib/turnstile";


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

const RESEND_COOLDOWN = 30;

const EmailAuthForm = ({ onSuccess, onModeChange, initialEmail = "", initialMode = "signin" }: EmailAuthFormProps) => {
  const { signInWithEmail, signUpWithEmail, resendConfirmation, resetPassword } = useAuth();
  const [mode, setModeState] = useState<Mode>(initialMode);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [screen, setScreen] = useState<"form" | "confirm" | "reset-sent">("form");
  const [cooldown, setCooldown] = useState(0);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState(false);
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  /** Token Turnstile jest jednorazowy — po każdej nieudanej próbie resetujemy widget. */
  const resetCaptcha = () => {
    setCaptchaToken("");
    setCaptchaError(false);
    turnstileRef.current?.reset();
  };


  const setMode = (next: Mode) => {
    setModeState(next);
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setInfo(null);

    if (!email.trim()) {
      setError("Podaj adres e-mail.");
      return;
    }
    if (mode !== "reset" && password.length < 6) {
      setError("Hasło musi mieć co najmniej 6 znaków.");
      return;
    }
    if (!captchaToken) {
      setError(TURNSTILE_ERROR_MESSAGE);
      return;
    }

    setBusy(true);
    try {
      if (mode === "reset") {
        await resetPassword(email, captchaToken);
        setScreen("reset-sent");
      } else if (mode === "signup") {
        await signUpWithEmail(email, password, captchaToken);
        setScreen("confirm");
        setCooldown(RESEND_COOLDOWN);
      } else {
        await signInWithEmail(email, password, captchaToken);
        onSuccess?.();
      }
      setCaptchaToken("");
      turnstileRef.current?.reset();
    } catch (err) {
      setError(isCaptchaError(err) ? TURNSTILE_ERROR_MESSAGE : translateAuthError(err));
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
      setError(isCaptchaError(err) ? TURNSTILE_ERROR_MESSAGE : translateAuthError(err));
      if (isEmailRateLimitError(err)) setCooldown(RESEND_COOLDOWN);
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
        {error && <p className="text-sm text-destructive">{error}</p>}
        {info && <p className="text-sm text-muted-foreground">{info}</p>}
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
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="auth-email">E-mail</Label>
        <Input
          id="auth-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="rodzina@example.com"
        />
      </div>

      {mode !== "reset" && (
        <div className="space-y-1.5">
          <Label htmlFor="auth-password">Hasło</Label>
          <Input
            id="auth-password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="min. 6 znaków"
          />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-center">
        <Turnstile
          ref={turnstileRef}
          siteKey={TURNSTILE_SITE_KEY}
          onSuccess={setCaptchaToken}
          onExpire={() => setCaptchaToken("")}
          onError={() => {
            setCaptchaToken("");
            setError(TURNSTILE_ERROR_MESSAGE);
          }}
          options={{ size: "flexible" }}
        />
      </div>

      <Button type="submit" disabled={busy || !captchaToken} className="w-full">

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

      {mode === "signup" && (
        <p className="text-xs text-muted-foreground text-center">
          Zakładając konto akceptujesz{" "}
          <a
            href="/regulamin"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            Regulamin
          </a>{" "}
          i{" "}
          <a
            href="/polityka-prywatnosci"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            Politykę prywatności
          </a>
          .
        </p>
      )}

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
