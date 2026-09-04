import { useState, useEffect, useRef } from "react";
import { Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import EmailAuthForm from "@/components/EmailAuthForm";
import { usePendingIntent } from "@/contexts/PendingIntentContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const MODAL_HISTORY_KEY = "authModalOpen";

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoogleClick?: () => Promise<void> | void;
  onEmailClick?: () => Promise<void> | void;
  onLoginClick?: () => Promise<void> | void;
  title?: string;
  description?: string;
  /** Panel admina: tylko logowanie Google. */
  googleOnly?: boolean;
}

const AuthRequiredModal = ({
  isOpen,
  onClose,
  onGoogleClick,
  onEmailClick,
  onLoginClick,
  title = "Zapisz to miejsce na później",
  description = "Aby zapisywać ulubione atrakcje i planować wizyty, potrzebujesz konta.",
  googleOnly = false,
}: AuthRequiredModalProps) => {
  const [isLoading, setIsLoading] = useState<'google' | 'email' | 'login' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailMode, setEmailMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const { markAuthAttempt } = usePendingIntent();

  // A) „Wstecz" zamyka wyłącznie modal, strona zostaje (F-16).
  // Przy otwarciu dokładamy wpis-atrapę (ten sam URL, znacznik w `history.state`),
  // przy zamknięciu go zdejmujemy. Dzięki temu „wstecz" w przeglądarce cofa
  // tylko do poprzedniego wpisu, nie zmieniając adresu strony.
  const pushedRef = useRef(false);
  const onCloseRef = useRef(onClose);

  // Najświeższe `onClose` trzymamy w refie, żeby listener `popstate` mógł być
  // podpięty RAZ (patrz GRABIE niżej).
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  /**
   * Zdejmuje wpis-atrapę, jeśli wciąż na nim stoimy. Wywoływane przy każdym
   * zamknięciu INNYM niż „wstecz" (Esc, klik w tło, X, udane logowanie e-mailem)
   * oraz przy odmontowaniu z otwartym modalem — jedna ścieżka dla wszystkich,
   * więc w historii nie zostaje sierocy wpis.
   *
   * `pushedRef` czyścimy PRZED `history.back()`. Popstate wywołany naszym własnym
   * cofnięciem trafia wtedy na `pushedRef === false` i nic nie robi. Nie ma tu
   * żadnej flagi „połknij następne popstate" — taka flaga potrafiła zjeść
   * PRAWDZIWE cofnięcie użytkownika.
   */
  const zdejmijWpisAtrape = () => {
    if (!pushedRef.current) return;
    pushedRef.current = false;
    // Ktoś już przenawigował (np. AdminLayout robi navigate(..., replace))
    // — wpisu-atrapy nie ma, cofnięcie zabrałoby użytkownika o stronę za daleko.
    if (!window.history.state?.[MODAL_HISTORY_KEY]) return;
    try {
      window.history.back();
    } catch {
      /* brak History API */
    }
  };

  useEffect(() => {
    if (!isOpen || pushedRef.current) return;
    try {
      // Stan react-routera (`idx`, `key`) przepisujemy — bez `idx` kolejne
      // `navigate()` przy otwartym modalu liczyłoby indeks jako NaN.
      window.history.pushState(
        { ...(window.history.state as Record<string, unknown> | null), [MODAL_HISTORY_KEY]: true },
        "",
        window.location.href,
      );
      pushedRef.current = true;
    } catch {
      /* brak History API — modal działa dalej, tylko bez wpisu w historii */
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;
    zdejmijWpisAtrape();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (!pushedRef.current) return;
      if ((event.state as Record<string, unknown> | null)?.[MODAL_HISTORY_KEY]) return;
      pushedRef.current = false;
      onCloseRef.current();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    // GRABIE (F-16): lista zależności MUSI być pusta. Wcześniej stało tu
    // `[onClose]`, a konsumenci przekazują `onClose` jako inline-arrow — nowa
    // tożsamość przy każdym renderze, więc listener odpinał się i podpinał
    // bez przerwy. Po nawigacji SPA react-router renderuje dokładnie w trakcie
    // dispatchu `popstate`; listener dodany W TRAKCIE dispatchu nie dostaje tego
    // zdarzenia (DOM zamraża listę słuchaczy na starcie dispatchu). Skutek:
    // pierwsze „wstecz" było połykane, modal zostawał otwarty, a strona i tak
    // się cofała. Dlatego `onClose` czytamy z refa, nie z domknięcia.
  }, []);

  useEffect(() => {
    return () => {
      zdejmijWpisAtrape();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsLoading(null);
      setError(null);
      setEmailMode('signin');
    }
  }, [isOpen]);

  const handleAction = async (
    action: (() => Promise<void> | void) | undefined,
    type: 'google' | 'email' | 'login'
  ) => {
    if (!action || isLoading) return;
    
    setError(null);
    setIsLoading(type);
    // Rozpoczęto logowanie — oczekująca intencja musi przetrwać zamknięcie modalu.
    markAuthAttempt();
    
    try {
      await action();
    } catch {
      setError("Nie udało się zalogować. Spróbuj ponownie.");
    } finally {
      setIsLoading(null);
    }
  };

  const dismissError = () => setError(null);

  const isSignup = !googleOnly && emailMode === 'signup';
  const shownTitle = isSignup ? "Załóż konto" : title;
  const shownDescription = isSignup
    ? "Załóż darmowe konto, aby zapisywać ulubione atrakcje, planować wizyty i oceniać miejsca."
    : description;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[90vh] [@supports(height:100dvh)]:max-h-[90dvh] overflow-y-auto">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-xl font-serif">
            {shownTitle}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground pt-2">
            {shownDescription}
          </DialogDescription>
        </DialogHeader>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between gap-2 px-3 py-2.5 bg-muted/60 border border-border rounded-lg"
            >
              <p className="text-sm text-muted-foreground">
                {error}
              </p>
              <button
                onClick={dismissError}
                className="shrink-0 p-1 rounded-md hover:bg-accent transition-colors"
                aria-label="Zamknij komunikat"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-3 pt-2">
          {/* Google button — obok logowania e-mailem poniżej (poza panelem admina). */}
          <Button 
            onClick={() => handleAction(onGoogleClick, 'google')}
            className="w-full"
            variant="default"
            disabled={isLoading !== null}
          >
            {isLoading === 'google' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Logowanie...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Kontynuuj z Google
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Kontynuując, akceptujesz{" "}
            <a href="/regulamin" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              Regulamin
            </a>
            . Zasady przetwarzania danych opisuje{" "}
            <a href="/polityka-prywatnosci" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              Polityka prywatności
            </a>
            .
          </p>

          {!googleOnly && (
            <>
              <div className="flex items-center gap-3 py-1">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">lub e-mailem</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <EmailAuthForm
                onSuccess={() => {
                  markAuthAttempt();
                  onClose();
                }}
                onModeChange={setEmailMode}
              />
            </>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default AuthRequiredModal;
