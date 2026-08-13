import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { translateAuthError } from "@/lib/authErrors";

type Mode = "signin" | "signup" | "reset";

interface EmailAuthFormProps {
  /** Wywoływane po udanym zalogowaniu e-mailem. */
  onSuccess?: () => void;
}

const EmailAuthForm = ({ onSuccess }: EmailAuthFormProps) => {
  const { signInWithEmail, signUpWithEmail, resendConfirmation, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [screen, setScreen] = useState<"form" | "confirm" | "reset-sent">("form");

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

    setBusy(true);
    try {
      if (mode === "reset") {
        await resetPassword(email);
        setScreen("reset-sent");
      } else if (mode === "signup") {
        await signUpWithEmail(email, password);
        setScreen("confirm");
      } else {
        await signInWithEmail(email, password);
        onSuccess?.();
      }
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await resendConfirmation(email);
      setInfo("Wysłaliśmy link ponownie.");
    } catch (err) {
      setError(translateAuthError(err));
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
            <Button variant="outline" onClick={resend} disabled={busy} className="w-full">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Wyślij link ponownie"}
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

      <Button type="submit" disabled={busy} className="w-full">
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
