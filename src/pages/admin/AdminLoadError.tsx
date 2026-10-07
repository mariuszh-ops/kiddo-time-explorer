import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminLoadErrorProps {
  /** Dopelniacz: „opinii", „zgłoszeń", „danych"… — wstawiany w „Nie udało się pobrać …". */
  what: string;
  onRetry: () => void;
  /** Trwa ponowny odczyt — przycisk zablokowany, komunikat zostaje (bez migania pustki). */
  retrying?: boolean;
}

/**
 * Trwaly stan bledu odczytu listy w panelu admina (GL-3-018/046/054/058).
 * Zastepuje „Brak … w tej kolejce", ktore po zgasnieciu toasta udawalo pusta kolejke.
 */
const AdminLoadError = ({ what, onRetry, retrying = false }: AdminLoadErrorProps) => (
  <div role="alert" className="py-12 px-4 flex flex-col items-center text-center gap-2" data-admin-load-error>
    <AlertTriangle className="w-6 h-6 text-destructive" aria-hidden="true" />
    <p className="font-medium text-foreground">Nie udało się pobrać {what}.</p>
    <p className="text-sm text-muted-foreground">
      To błąd odczytu, a nie pusta lista. Spróbuj ponownie — jeśli błąd wraca, odśwież stronę.
    </p>
    <Button variant="outline" className="tap44 mt-2" onClick={onRetry} disabled={retrying}>
      {retrying ? "Ładowanie…" : "Spróbuj ponownie"}
    </Button>
  </div>
);

export default AdminLoadError;
