import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import DeleteAccountSection from "@/components/DeleteAccountSection";
import { buildMyDataExport, downloadJson, exportFileName } from "@/lib/exportMyData";

/**
 * Karta „Prywatność i dane" w /profile: kopia danych (N-20, art. 15 i 20 RODO)
 * i usunięcie konta (S-131). Osobno od danych dostępowych — układ jak
 * w Google Account / Airbnb / Booking.
 */
const PrivacyDataSection = () => {
  const { user } = useAuth();
  const [exportBusy, setExportBusy] = useState(false);

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

  return (
    <section aria-labelledby="prywatnosc-tytul" className="bg-card rounded-xl border border-border overflow-hidden">
      <h2 id="prywatnosc-tytul" className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-6 pt-5 pb-1">
        Prywatność i dane
      </h2>

      <button
        type="button"
        onClick={exportData}
        disabled={exportBusy}
        aria-describedby="eksport-danych-opis"
        className="w-full flex items-center justify-between px-6 pt-3 pb-1 min-h-[44px] hover:bg-accent/50 transition-colors text-left disabled:opacity-60"
      >
        <div className="flex items-center gap-3">
          {exportBusy ? (
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" aria-hidden="true" />
          ) : (
            <Download className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
          )}
          <span className="text-sm text-foreground">{exportBusy ? "Przygotowuję plik…" : "Pobierz kopię swoich danych (JSON)"}</span>
        </div>
      </button>
      {/* Plik z przegladarki nie jest pelna kopia z art. 15 (nie ma w nim
          client_errors ani auth.identities) — stad odsylacz do kontaktu.
          Pelna kopie robi 7_public/eksport_uzytkownika.py; szczegoly w polityce. */}
      <p id="eksport-danych-opis" className="px-6 pb-3.5 pl-[3.25rem] text-xs text-muted-foreground">
        Zapisane miejsca, oceny, opinie i dane konta. Pełną kopię wyślemy na prośbę:{" "}
        <a className="underline hover:text-foreground" href="mailto:kontakt@familyfun.pl">
          kontakt@familyfun.pl
        </a>
        .
      </p>

      <DeleteAccountSection />
    </section>
  );
};

export default PrivacyDataSection;
