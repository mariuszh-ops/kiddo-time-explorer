import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import AuthRequiredModal from "@/components/AuthRequiredModal";
import { useAuth } from "@/contexts/AuthContext";
import { usePendingIntent } from "@/contexts/PendingIntentContext";

/**
 * INP (A1000-P): JEDEN modal logowania dla wszystkich kart atrakcji.
 *
 * Wcześniej każda `ActivityCard` montowała własny, zamknięty `AuthRequiredModal`
 * (z Radix Dialog, portalem i dwoma Presence). Każda zmiana listy oznaczała
 * 48 montaży modali (chip filtra na „/”: 48 kart = 48 modali), a klik serca
 * renderował modal w karcie. Karta woła teraz tylko `otworz()` — stała
 * tożsamość, więc otwarcie modala nie renderuje żadnej karty.
 *
 * Zachowanie jak w karcie: domyślny tytuł i opis, logowanie Google z każdego
 * przycisku, zamknięcie bez próby logowania kasuje intencję. Fokus po
 * zamknięciu wraca na opener (serce) przez `returnFocus` w `DialogContent`,
 * niezależnie od miejsca modala w drzewie.
 */
const CardAuthModalContext = createContext<(() => void) | undefined>(undefined);

export function CardAuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { signInWithGoogle } = useAuth();
  const { cancelPendingIntent } = usePendingIntent();
  const otworz = useCallback(() => setIsOpen(true), []);

  const handleAuthAction = async () => {
    // NIE zamykamy modalu po starcie logowania Google. `signInWithOAuth` robi
    // `location.assign(...)` na Supabase i wraca od razu; zamkniecie modalu
    // odpalilo by efekt `window.history.back()` (wstecz zamyka modal), a to
    // przerywa trwajaca nawigacje (net::ERR_ABORTED) i uzytkownik zostaje na
    // stronie — klikniecie "Kontynuuj z Google" nie robi nic.
    await signInWithGoogle();
  };

  return (
    <CardAuthModalContext.Provider value={otworz}>
      {children}
      <AuthRequiredModal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          // Anulowane bez próby logowania — intencja przepada.
          cancelPendingIntent();
        }}
        onGoogleClick={handleAuthAction}
        onEmailClick={handleAuthAction}
        onLoginClick={handleAuthAction}
      />
    </CardAuthModalContext.Provider>
  );
}

/** Otwiera wspólny modal logowania kart. Stała tożsamość. */
export function useOpenCardAuthModal() {
  const ctx = useContext(CardAuthModalContext);
  if (!ctx) throw new Error("useOpenCardAuthModal must be used within a CardAuthModalProvider");
  return ctx;
}
