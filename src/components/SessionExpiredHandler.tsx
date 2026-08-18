import { useEffect, useState } from "react";
import { toast } from "sonner";
import { onInvalidSession } from "@/lib/sessionRecovery";
import { catalogClient as supabase, CATALOG_AUTH_STORAGE_KEY } from "@/lib/catalogClient";
import AuthRequiredModal from "@/components/AuthRequiredModal";
import { useAuth } from "@/contexts/AuthContext";

/**
 * S-127: uszkodzony/wygasły token sesji. Klient katalogu wykrywa 401/PGRST301,
 * my sprzątamy sesję lokalnie i pokazujemy jednorazowy komunikat z logowaniem.
 * Katalog publiczny działa dalej jako dla niezalogowanego.
 */
const SessionExpiredHandler = () => {
  const { signInWithGoogle } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    return onInvalidSession(() => {
      void supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      try {
        window.localStorage.removeItem(CATALOG_AUTH_STORAGE_KEY);
      } catch {
        // silent
      }
      toast.error("Twoja sesja wygasła — zaloguj się ponownie", {
        duration: 10000,
        action: { label: "Zaloguj się", onClick: () => setIsModalOpen(true) },
      });
    });
  }, []);

  return (
    <AuthRequiredModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      onGoogleClick={signInWithGoogle}
      title="Zaloguj się ponownie"
      description="Twoja sesja wygasła. Zaloguj się, aby wrócić do swoich zapisanych miejsc."
    />
  );
};

export default SessionExpiredHandler;
