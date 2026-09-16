import { useEffect, useState } from "react";
import { toast } from "sonner";
import { onInvalidSession, type InvalidSessionReason } from "@/lib/sessionRecovery";
import {
  catalogClient as supabase,
  CATALOG_AUTH_STORAGE_KEY,
  getClockSkewMs,
} from "@/lib/catalogClient";
import { pluralPl } from "@/lib/plural";
import AuthRequiredModal from "@/components/AuthRequiredModal";
import { useAuth } from "@/contexts/AuthContext";

/**
 * X-H-01: opisz odchylenie zegara po polsku, w bierniku ("o około ...").
 * Odchylenie to czas serwera - czas urządzenia, więc wartość UJEMNA znaczy,
 * że urządzenie jest do przodu (to właśnie ten przypadek psuje logowanie).
 */
const opiszOdchylenieZegara = (odchylenieMs: number): string => {
  const abs = Math.abs(odchylenieMs);
  const kierunek = odchylenieMs < 0 ? "do przodu" : "do tyłu";
  if (abs >= 3_600_000) {
    const godziny = Math.round(abs / 3_600_000);
    const slowo = pluralPl(godziny, "godzinę", "godziny", "godzin");
    return `${godziny === 1 ? "" : `${godziny} `}${slowo} ${kierunek}`;
  }
  const minuty = Math.max(1, Math.round(abs / 60_000));
  const slowo = pluralPl(minuty, "minutę", "minuty", "minut");
  return `${minuty === 1 ? "" : `${minuty} `}${slowo} ${kierunek}`;
};

const OPIS_WYGASLA =
  "Twoja sesja wygasła. Zaloguj się, aby wrócić do swoich zapisanych miejsc.";

/**
 * S-127: uszkodzony/wygasły token sesji. Klient katalogu wykrywa 401/PGRST301,
 * my sprzątamy sesję lokalnie i pokazujemy jednorazowy komunikat z logowaniem.
 * Katalog publiczny działa dalej jako dla niezalogowanego.
 *
 * X-H-01: drugi wariant komunikatu — gdy winny jest zegar urządzenia, samo
 * „zaloguj się ponownie” jest bezużyteczne (nowy token zepsuje się tak samo).
 * Mówimy wprost, o ile zegar jest przesunięty i co z tym zrobić.
 */
const SessionExpiredHandler = () => {
  const { signInWithGoogle } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [opisModala, setOpisModala] = useState(OPIS_WYGASLA);

  useEffect(() => {
    return onInvalidSession((powod: InvalidSessionReason) => {
      void supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      try {
        window.localStorage.removeItem(CATALOG_AUTH_STORAGE_KEY);
      } catch {
        // silent
      }

      const odchylenie = getClockSkewMs();
      if (powod === "zegar" && odchylenie !== null) {
        const opis = opiszOdchylenieZegara(odchylenie);
        setOpisModala(
          `Zegar Twojego urządzenia jest przesunięty o około ${opis} względem czasu rzeczywistego. Ustaw automatyczną datę i godzinę, a potem zaloguj się ponownie.`
        );
        toast.error(
          `Zegar Twojego urządzenia jest przesunięty o około ${opis} względem czasu rzeczywistego, przez co nie możemy utrzymać Twojego logowania. Ustaw w telefonie automatyczną datę i godzinę, a potem zaloguj się ponownie.`,
          {
            duration: 20000,
            action: { label: "Zaloguj się", onClick: () => setIsModalOpen(true) },
          }
        );
        return;
      }

      setOpisModala(OPIS_WYGASLA);
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
      description={opisModala}
    />
  );
};

export default SessionExpiredHandler;
