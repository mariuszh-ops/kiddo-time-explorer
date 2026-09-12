import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AuthRequiredModal from "@/components/AuthRequiredModal";
import { useAuth } from "@/contexts/AuthContext";
import { translateAuthError } from "@/lib/authErrors";
import {
  TURNSTILE_SITE_KEY,
  TURNSTILE_ERROR_MESSAGE,
  TURNSTILE_BLOCKED_MESSAGE,
  TURNSTILE_OUR_FAULT_MESSAGE,
  turnstileUnavailableMessage,
  isCaptchaError,
} from "@/lib/turnstile";

/** Który ekran pokazujemy po powrocie z linku e-mailowego. */
type Widok = "none" | "expired" | "other";

/** D-15: budżet liczony od otwarcia dialogu do WYRENDEROWANIA widgetu. */
const TURNSTILE_TIMEOUT_MS = 15000;

/** Tyle, ile sprawdza przeglądarka dla type="email" — bez pretensji do RFC. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * T-H-09: nazwane kody błędów GoTrue, dla których umiemy powiedzieć coś
 * konkretnego. Wszystko poza tą listą (i poza „link wygasł") dostaje
 * komunikat domyślny — nikt nie ma prawa zostać z pustym ekranem.
 */
const KOMUNIKATY: Record<string, string> = {
  server_error:
    "Serwer logowania nie zdołał obsłużyć tego linku. To problem po naszej stronie — spróbuj zalogować się jeszcze raz za chwilę.",
  unexpected_failure:
    "Serwer logowania zwrócił nieoczekiwany błąd. Spróbuj zalogować się jeszcze raz za chwilę.",
  bad_oauth_state:
    "Logowanie przerwało się w połowie — najczęściej przez odświeżenie strony albo cofnięcie. Zacznij od nowa.",
  bad_code_verifier:
    "Logowanie przerwało się w połowie — link został otwarty w innej przeglądarce niż ta, w której je zaczęto. Zacznij od nowa.",
  validation_failed:
    "Link jest niekompletny lub uszkodzony. Otwórz go bezpośrednio z wiadomości e-mail albo zaloguj się ponownie.",
  email_exists:
    "Ten adres e-mail jest już przypisany do konta. Zaloguj się na nie zamiast potwierdzać link.",
};

const KOMUNIKAT_DOMYSLNY =
  "Nie udało się otworzyć tego linku. Zaloguj się ponownie albo poproś o nowy link z wiadomości e-mail.";

/**
 * Kod z adresu pokazujemy wyłącznie jako ślad dla wsparcia i tylko wtedy, gdy
 * wygląda jak kod — do UI nie trafia dowolny tekst z paska adresu.
 */
const bezpiecznyKod = (kod: string | null): string | null =>
  kod && /^[a-zA-Z0-9_-]{1,64}$/.test(kod) ? kod : null;

/**
 * Obsługuje powrót z linku e-mailowego, który wygasł, został już użyty albo
 * rozbił się o błąd serwera. Czyta #error / error_code z fragmentu adresu,
 * pokazuje polski komunikat i pozwala wysłać nowy link potwierdzający.
 *
 * T-B-02: wysyłka nowego linku wymaga tokenu Turnstile — bez niego
 * /auth/v1/resend odpowiada 400 captcha_failed KAŻDEMU użytkownikowi.
 */
const AuthLinkErrorHandler = () => {
  const { resendConfirmation, signInWithGoogle } = useAuth();
  const [widok, setWidok] = useState<Widok>("none");
  const [komunikat, setKomunikat] = useState(KOMUNIKAT_DOMYSLNY);
  const [kodBledu, setKodBledu] = useState<string | null>(null);
  const [logowanieOtwarte, setLogowanieOtwarte] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState(false);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const captchaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** D-15: widget stoi w dialogu i czeka na kliknięcie — to NIE jest awaria. */
  const widgetReadyRef = useRef(false);

  const clearCaptchaTimeout = () => {
    if (captchaTimeoutRef.current) {
      clearTimeout(captchaTimeoutRef.current);
      captchaTimeoutRef.current = null;
    }
  };

  /** Token Turnstile jest jednorazowy — po każdej nieudanej próbie resetujemy widget. */
  const resetCaptcha = () => {
    setCaptchaToken("");
    setCaptchaError(false);
    turnstileRef.current?.reset();
  };

  /**
   * I-09: treść zależy od tego, czy skrypt Cloudflare w ogóle się wczytał —
   * nie obwiniamy rozszerzeń użytkownika, gdy wina jest po naszej stronie.
   */
  const markCaptchaUnavailable = () => {
    clearCaptchaTimeout();
    setCaptchaError(true);
    setError(turnstileUnavailableMessage());
  };

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("error")) return;
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const code = params.get("error_code");
    const err = params.get("error");
    if (!code && !err) return;
    if (code === "otp_expired" || code === "access_denied" || err === "access_denied") {
      setWidok("expired");
    } else {
      // T-H-09: nierozpoznany kod NIE może kończyć się pustym ekranem.
      setKomunikat(KOMUNIKATY[code ?? ""] ?? KOMUNIKATY[err ?? ""] ?? KOMUNIKAT_DOMYSLNY);
      setKodBledu(bezpiecznyKod(code) ?? bezpiecznyKod(err));
      setWidok("other");
    }
    // Wyczyść fragment z adresu.
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search
    );
  }, []);

  useEffect(() => {
    // Widget montuje się razem z dialogiem, więc budżet liczymy dopiero stąd.
    // Jeśli Turnstile nie zdąży się WYRENDEROWAĆ (adblock/filtr DNS/awaria),
    // mówimy o tym wprost, zamiast wysyłać żądanie bez tokenu — takie żądanie
    // i tak wraca jako 400 captcha_failed.
    if (widok !== "expired" || sent) return;
    widgetReadyRef.current = false;
    captchaTimeoutRef.current = setTimeout(() => {
      if (!widgetReadyRef.current) {
        markCaptchaUnavailable();
      }
    }, TURNSTILE_TIMEOUT_MS);
    return clearCaptchaTimeout;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widok, sent]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const adres = email.trim();
    if (!adres) {
      setError("Podaj adres e-mail.");
      return;
    }
    if (!EMAIL_PATTERN.test(adres)) {
      setError("Podaj poprawny adres e-mail, np. rodzina@example.com.");
      return;
    }
    // Bez tokenu nie wysyłamy nic — /auth/v1/resend wymaga captchy globalnie.
    if (!captchaToken) {
      setError(captchaError ? turnstileUnavailableMessage() : TURNSTILE_ERROR_MESSAGE);
      return;
    }
    setBusy(true);
    try {
      await resendConfirmation(adres, captchaToken);
      clearCaptchaTimeout();
      setSent(true);
    } catch (err) {
      // Odmowa NIE jest sukcesem: `sent` zostaje na false, przycisk wraca do
      // stanu klikalnego, a token zużyty przy próbie wymieniamy na nowy.
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

  return (
    <>
      <Dialog
        open={widok === "expired"}
        onOpenChange={(open) => {
          if (!open) setWidok("none");
        }}
      >
        <DialogContent className="max-w-sm max-h-[90vh] [@supports(height:100svh)]:max-h-[90svh] overflow-y-auto">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="text-xl font-serif">
              Ten link wygasł lub został już użyty
            </DialogTitle>
            <DialogDescription className="pt-2">
              {sent
                ? "Wysłaliśmy nowy link potwierdzający. Sprawdź skrzynkę."
                : "Podaj swój adres e-mail, a wyślemy nowy link potwierdzający."}
            </DialogDescription>
          </DialogHeader>

          {!sent && (
            <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="relink-email">E-mail</Label>
                <Input
                  id="relink-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rodzina@example.com"
                  aria-describedby={error ? "relink-error" : undefined}
                />
              </div>

              <div className="flex justify-center">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={TURNSTILE_SITE_KEY}
                  onWidgetLoad={() => {
                    // D-15: widget jest na ekranie — dalej to już tylko czekanie
                    // na użytkownika, budżet nie ma prawa go ubić.
                    widgetReadyRef.current = true;
                    clearCaptchaTimeout();
                  }}
                  onSuccess={(token) => {
                    widgetReadyRef.current = true;
                    clearCaptchaTimeout();
                    setCaptchaToken(token);
                    setCaptchaError(false);
                    // GRABIE: NIE kasować tutaj TURNSTILE_ERROR_MESSAGE. Po
                    // odmowie z serwera robimy `resetCaptcha()`, widget od razu
                    // wydaje nowy token i to `onSuccess` zdążyłoby zetrzeć
                    // komunikat o odmowie, zanim ktokolwiek go przeczyta.
                    setError((prev) =>
                      prev === TURNSTILE_BLOCKED_MESSAGE || prev === TURNSTILE_OUR_FAULT_MESSAGE
                        ? null
                        : prev
                    );
                  }}
                  // Token żyje ~5 min, a dialog bywa otwarty dłużej. Po wygaśnięciu
                  // od razu prosimy o nowy — inaczej klik trafiłby w captcha_failed.
                  onExpire={() => {
                    setCaptchaToken("");
                    turnstileRef.current?.reset();
                  }}
                  onError={markCaptchaUnavailable}
                  onUnsupported={markCaptchaUnavailable}
                  scriptOptions={{ onError: markCaptchaUnavailable }}
                  options={{ size: "flexible" }}
                />
              </div>

              {error && (
                <p id="relink-error" role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Wyślij nowy link"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* T-H-09: każdy inny kod błędu — komunikat po polsku i droga do logowania. */}
      <Dialog
        open={widok === "other"}
        onOpenChange={(open) => {
          if (!open) setWidok("none");
        }}
      >
        <DialogContent className="max-w-sm max-h-[90vh] [@supports(height:100svh)]:max-h-[90svh] overflow-y-auto">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="text-xl font-serif">
              Nie udało się otworzyć linku
            </DialogTitle>
            <DialogDescription className="pt-2">{komunikat}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              onClick={() => {
                setWidok("none");
                setLogowanieOtwarte(true);
              }}
            >
              Zaloguj się
            </Button>
            <Button variant="ghost" asChild className="w-full">
              <a href="/">Wróć na stronę główną</a>
            </Button>
            {kodBledu && (
              <p className="text-xs text-muted-foreground text-center">
                Kod błędu: {kodBledu}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AuthRequiredModal
        isOpen={logowanieOtwarte}
        onClose={() => setLogowanieOtwarte(false)}
        onGoogleClick={signInWithGoogle}
        title="Zaloguj się"
        description="Zaloguj się, aby wrócić do swojego konta."
      />
    </>
  );
};

export default AuthLinkErrorHandler;
