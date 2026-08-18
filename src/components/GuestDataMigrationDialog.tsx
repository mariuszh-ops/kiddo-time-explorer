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
import { subscribeGuestMigration, resolveGuestMigration } from "@/lib/guestMigration";

/**
 * S-184: dane zebrane jako gość przenosimy na konto WYŁĄCZNIE po jawnym
 * potwierdzeniu (i tylko gdy powstały w tej samej sesji przeglądarki).
 */
const GuestDataMigrationDialog = () => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => subscribeGuestMigration(setCount), []);

  return (
    <AlertDialog open={count !== null}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-serif">Dodać zapisy z tej przeglądarki?</AlertDialogTitle>
          <AlertDialogDescription>
            Znaleźliśmy {count ?? 0} zapisanych miejsc z tej przeglądarki. Dodać je do Twojego konta?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => resolveGuestMigration(false)}>
            Nie, to nie moje
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => resolveGuestMigration(true)}>Dodaj</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default GuestDataMigrationDialog;
