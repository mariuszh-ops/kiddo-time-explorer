import { useEffect, useState } from "react";
import { ChevronDown, Download, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { translateAuthError } from "@/lib/authErrors";
import { checkPassword, passwordErrorMessage, PASSWORD_HINT } from "@/lib/passwordPolicy";
import PasswordRequirements from "@/components/PasswordRequirements";
import DeleteAccountSection from "@/components/DeleteAccountSection";
import { buildMyDataExport, downloadJson, exportFileName } from "@/lib/exportMyData";

/** Tyle, ile sprawdza przeglądarka dla type="email" — jak w EmailAuthForm. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MIN = 2;
const NAME_MAX = 60;

/** Nazwa po oczyszczeniu: pojedyncze spacje, bez końcówek. */
export const normalizeDisplayName = (raw: string): string => raw.replace(/\s+/g, " ").trim();

/**
 * Komunikat z linku zmiany e-maila. GoTrue wraca na /profile z `#message=…`
 * po pierwszym z dwóch linków (secure email change) albo z `#error_description=…`,
 * gdy link wygasł. supabase-js sam zdejmuje z URL tylko tokeny sesji.
 */
const readAuthHashMessage = (): { kind: "info" | "error"; text: string } | null => {
  if (typeof window === "undefined" || !window.location.hash) return null;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const err = params.get("error_description");
  if (err) {
    return {
      kind: "error",
      text: /expired|invalid/i.test(err)
        ? "Link wygasł lub został już użyty. Wyślij zmianę adresu jeszcze raz."
        : err,
    };
  }
  const msg = params.get("message");
  if (msg) {
    return {
      kind: "info",
      text: /other email/i.test(msg)
        ? "Pierwszy link potwierdzony. Kliknij jeszcze link z drugiej wiadomości, żeby dokończyć zmianę adresu."
        : msg,
    };
  }
  return null;
};

const errorMessage = (err: unknown): string =>
  String((err as { message?: string } | null)?.message ?? "").toLowerCase();

/**
 * I-11 — sekcja „Twoje konto" w /profile: nazwa wyświetlana, e-mail, hasło,
 * kopia danych (N-20) i usunięcie konta (S-131). Wszystko przez Supabase Auth
 * `updateUser`; kontekst `user` odświeża się sam po zdarzeniu USER_UPDATED.
 */
const AccountSettingsSection = () => {
  const { user, updateDisplayName, updateEmail, updatePassword, requestReauthentication } = useAuth();
  const currentName = user?.name ?? "";
  const currentEmail = user?.email ?? "";
  // Konto z Google bez hasła: „Ustaw hasło" zamiast „Zmień hasło". Brak listy
  // dostawców (stare sesje, demo) traktujemy jak konto z hasłem.
  const hasPasswordLogin = !user?.providers || user.providers.includes("email");

  // Nazwa wyświetlana
  const [name, setName] = useState(currentName);
  const [nameBusy, setNameBusy] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameOk, setNameOk] = useState<string | null>(null);
  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  // E-mail
  const [email, setEmail] = useState(currentEmail);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailOk, setEmailOk] = useState<string | null>(null);
  useEffect(() => {
    setEmail(currentEmail);
  }, [currentEmail]);

  // Hasło
  const [pwdOpen, setPwdOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [nonce, setNonce] = useState("");
  const [needsNonce, setNeedsNonce] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdInfo, setPwdInfo] = useState<string | null>(null);

  // Kopia danych
  const [exportBusy, setExportBusy] = useState(false);

  useEffect(() => {
    const m = readAuthHashMessage();
    if (!m) return;
    if (m.kind === "error") toast.error(m.text);
    else toast.info(m.text);
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nameBusy) return;
    setNameError(null);
    setNameOk(null);
    const clean = normalizeDisplayName(name);
    if (clean.length < NAME_MIN) {
      setNameError(`Nazwa musi mieć co najmniej ${NAME_MIN} znaki.`);
      return;
    }
    if (clean.length > NAME_MAX) {
      setNameError(`Nazwa może mieć najwyżej ${NAME_MAX} znaków.`);
      return;
    }
    if (clean === currentName) {
      setNameOk("Nazwa bez zmian.");
      return;
    }
    setNameBusy(true);
    try {
      await updateDisplayName(clean);
      setNameOk("Zapisano nową nazwę.");
      toast.success("Nazwa wyświetlana zapisana");
    } catch (err) {
      setNameError(translateAuthError(err));
    } finally {
      setNameBusy(false);
    }
  };

  const saveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailBusy) return;
    setEmailError(null);
    setEmailOk(null);
    const clean = email.trim();
    if (!EMAIL_PATTERN.test(clean)) {
      setEmailError("Podaj poprawny adres e-mail.");
      return;
    }
    if (clean.toLowerCase() === currentEmail.toLowerCase()) {
      setEmailError("To jest Twój obecny adres.");
      return;
    }
    setEmailBusy(true);
    try {
      await updateEmail(clean);
      setEmailOk(
        `Wysłaliśmy linki potwierdzające na ${currentEmail} i ${clean}. Zmiana zadziała po kliknięciu obu.`
      );
    } catch (err) {
      setEmailError(translateAuthError(err));
    } finally {
      setEmailBusy(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdBusy) return;
    setPwdError(null);
    const policyError = passwordErrorMessage(password);
    if (policyError) {
      setPwdError(policyError);
      return;
    }
    if (needsNonce && nonce.trim().length < 4) {
      setPwdError("Wpisz kod z wiadomości e-mail.");
      return;
    }
    setPwdBusy(true);
    try {
      await updatePassword(password, needsNonce ? nonce.trim() : undefined);
      setPassword("");
      setNonce("");
      setNeedsNonce(false);
      setPwdInfo(null);
      setPwdOpen(false);
      toast.success(hasPasswordLogin ? "Hasło zmienione" : "Hasło ustawione");
    } catch (err) {
      if (errorMessage(err).includes("reauthentication") && !needsNonce) {
        // M-13: serwer wymaga potwierdzenia (Secure password change w Supabase) —
        // wysyłamy kod na e-mail i dokładamy pole. Bez tego ustawienia ta gałąź nie działa.
        try {
          await requestReauthentication();
          setNeedsNonce(true);
          setPwdInfo("Wysłaliśmy kod na Twój e-mail. Wpisz go poniżej i zapisz hasło jeszcze raz.");
        } catch (err2) {
          setPwdError(translateAuthError(err2));
        }
      } else {
        setPwdError(translateAuthError(err));
      }
    } finally {
      setPwdBusy(false);
    }
  };

  const exportData = async () => {
    if (!user || exportBusy) return;
    setExportBusy(true);
    try {
      const data = await buildMyDataExport(user);
      downloadJson(data, exportFileName());
      toast.success("Plik z Twoimi danymi został pobrany");
    } catch {
      toast.error("Nie udało się przygotować pliku. Spróbuj ponownie.");
    } finally {
      setExportBusy(false);
    }
  };

  const nameDescribedBy = ["account-name-hint", nameError && "account-name-error", nameOk && "account-name-status"]
    .filter(Boolean)
    .join(" ");
  const emailDescribedBy = ["account-email-hint", emailError && "account-email-error", emailOk && "account-email-status"]
    .filter(Boolean)
    .join(" ");
  const pwdDescribedBy = [pwdError && "account-password-error", pwdInfo && "account-password-info"]
    .filter(Boolean)
    .join(" ");

  return (
    <section aria-labelledby="konto-tytul" className="bg-card rounded-xl border border-border overflow-hidden">
      <h2 id="konto-tytul" className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-6 pt-5 pb-3">
        Twoje konto
      </h2>

      {/* Nazwa wyświetlana */}
      <form onSubmit={saveName} noValidate className="px-6 pb-5 space-y-2">
        <Label htmlFor="account-name">Nazwa wyświetlana</Label>
        <div className="flex gap-2">
          <Input
            id="account-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX}
            autoComplete="nickname"
            placeholder="np. Mama Zosi"
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameDescribedBy}
            className="flex-1 text-base md:text-sm"
          />
          <Button type="submit" disabled={nameBusy} className="shrink-0">
            {nameBusy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : "Zapisz"}
            {nameBusy && <span className="sr-only">Zapisuję…</span>}
          </Button>
        </div>
        <p id="account-name-hint" className="text-xs text-muted-foreground">
          Widoczna przy Twoich opiniach i w menu.
        </p>
        {nameError && (
          <p id="account-name-error" role="alert" className="text-sm text-destructive">
            {nameError}
          </p>
        )}
        {nameOk && (
          <p id="account-name-status" role="status" className="text-sm text-muted-foreground">
            {nameOk}
          </p>
        )}
      </form>

      {/* E-mail */}
      <form onSubmit={saveEmail} noValidate className="px-6 py-5 space-y-2 border-t border-border/50">
        <Label htmlFor="account-email">Adres e-mail</Label>
        <div className="flex gap-2">
          <Input
            id="account-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="rodzina@example.com"
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailDescribedBy}
            className="flex-1 text-base md:text-sm"
          />
          <Button type="submit" variant="outline" disabled={emailBusy} className="shrink-0">
            {emailBusy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : "Zmień"}
            {emailBusy && <span className="sr-only">Wysyłam…</span>}
          </Button>
        </div>
        <p id="account-email-hint" className="text-xs text-muted-foreground">
          {user?.pendingEmail ? (
            <>
              Czeka na potwierdzenie: <span className="font-medium text-foreground break-all">{user.pendingEmail}</span>.
              Kliknij linki w obu wiadomościach — na stary i nowy adres.
            </>
          ) : (
            "Nowy adres potwierdzisz linkami wysłanymi na stary i nowy e-mail."
          )}
        </p>
        {emailError && (
          <p id="account-email-error" role="alert" className="text-sm text-destructive">
            {emailError}
          </p>
        )}
        {emailOk && (
          <p id="account-email-status" role="status" className="text-sm text-muted-foreground">
            {emailOk}
          </p>
        )}
      </form>

      {/* Hasło */}
      <div className="border-t border-border/50">
        <button
          type="button"
          onClick={() => {
            setPwdOpen((v) => !v);
            setPwdError(null);
          }}
          aria-expanded={pwdOpen}
          aria-controls="account-password-form"
          className="w-full flex items-center justify-between px-6 py-3.5 min-h-[44px] hover:bg-accent/50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <KeyRound className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm text-foreground">{hasPasswordLogin ? "Zmień hasło" : "Ustaw hasło"}</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${pwdOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
        <form
          id="account-password-form"
          onSubmit={savePassword}
          noValidate
          hidden={!pwdOpen}
          className="px-6 pb-5 space-y-2"
        >
          {!hasPasswordLogin && (
            <p className="text-xs text-muted-foreground">
              Logujesz się przez Google. Po ustawieniu hasła zalogujesz się też e-mailem.
            </p>
          )}
          <Label htmlFor="account-new-password">Nowe hasło</Label>
          <Input
            id="account-new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={PASSWORD_HINT}
            aria-invalid={pwdError ? true : undefined}
            aria-describedby={pwdDescribedBy || undefined}
            className="text-base md:text-sm"
          />
          <PasswordRequirements password={password} />
          {needsNonce && (
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="account-reauth-code">Kod z wiadomości e-mail</Label>
              <Input
                id="account-reauth-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={nonce}
                onChange={(e) => setNonce(e.target.value)}
                maxLength={10}
                className="text-base md:text-sm"
              />
            </div>
          )}
          {pwdInfo && (
            <p id="account-password-info" role="status" className="text-sm text-muted-foreground">
              {pwdInfo}
            </p>
          )}
          {pwdError && (
            <p id="account-password-error" role="alert" className="text-sm text-destructive">
              {pwdError}
            </p>
          )}
          <Button type="submit" disabled={pwdBusy || !checkPassword(password).ok} className="w-full">
            {pwdBusy ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                Zapisuję…
              </>
            ) : (
              "Zapisz nowe hasło"
            )}
          </Button>
        </form>
      </div>

      {/* Kopia danych (N-20, art. 15 i 20 RODO) */}
      <button
        type="button"
        onClick={exportData}
        disabled={exportBusy}
        className="w-full flex items-center justify-between px-6 py-3.5 min-h-[44px] hover:bg-accent/50 transition-colors text-left border-t border-border/50 disabled:opacity-60"
      >
        <div className="flex items-center gap-3">
          {exportBusy ? (
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" aria-hidden="true" />
          ) : (
            <Download className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
          )}
          <span className="text-sm text-foreground">{exportBusy ? "Przygotowuję plik…" : "Pobierz moje dane (JSON)"}</span>
        </div>
      </button>

      <DeleteAccountSection />
    </section>
  );
};

export default AccountSettingsSection;
