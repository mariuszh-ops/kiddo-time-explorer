import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  subscribeGuestMigration,
  resolveGuestMigration,
  type GuestMigrationSummary,
} from "@/lib/guestMigration";

const savedPlacesLabel = (count: number) => {
  if (count === 1) return "1 zapisane miejsce";
  const lastTwo = count % 100;
  const last = count % 10;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) {
    return `${count} zapisane miejsca`;
  }
  return `${count} zapisanych miejsc`;
};

const ratingsLabel = (count: number) => {
  if (count === 1) return "1 ocenę";
  const lastTwo = count % 100;
  const last = count % 10;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) {
    return `${count} oceny`;
  }
  return `${count} ocen`;
};

/**
 * S-184: dane zebrane jako gość przenosimy na konto WYŁĄCZNIE po jawnym
 * potwierdzeniu (i tylko gdy powstały w tej samej sesji przeglądarki).
 */
const GuestDataMigrationDialog = () => {
  const [summary, setSummary] = useState<GuestMigrationSummary | null>(null);

  useEffect(() => subscribeGuestMigration(setSummary), []);

  return (
    <AlertDialog open={summary !== null}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-serif">Dodać zapisy z tej przeglądarki?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Znaleźliśmy z tej przeglądarki
              {summary?.savedPlaces ? ` ${savedPlacesLabel(summary.savedPlaces)}` : ""}
              {summary?.savedPlaces && summary?.ratings ? " oraz" : ""}
              {summary?.ratings ? ` ${ratingsLabel(summary.ratings)}` : ""}. Dodać je do Twojego konta?
            </span>
            <span className="block font-medium text-foreground">
              Jeśli z tej przeglądarki korzystał ktoś inny, wybierz „Nie, to nie moje”.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
            onClick={() => resolveGuestMigration(false)}
          >
            Nie, to nie moje
          </AlertDialogCancel>
          <AlertDialogAction
            className="border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => resolveGuestMigration(true)}
          >
            Dodaj
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default GuestDataMigrationDialog;
