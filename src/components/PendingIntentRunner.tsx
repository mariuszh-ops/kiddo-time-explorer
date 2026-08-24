import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { usePendingIntent } from "@/contexts/PendingIntentContext";
import { useSavedActivities } from "@/contexts/SavedActivitiesContext";
import { useUserRatings } from "@/contexts/UserRatingsContext";

/**
 * Wykonuje zapamiętaną intencję gościa (serce / „chcę odwiedzić" / ocena)
 * po udanym zalogowaniu lub rejestracji. Intencja żyje tylko w pamięci karty.
 */
const PendingIntentRunner = () => {
  const { isLoggedIn } = useAuth();
  const { pendingIntent, clearPendingIntent } = usePendingIntent();
  const {
    isFavorite,
    isWantToVisit,
    toggleFavorite,
    toggleWantToVisit,
    isLoading,
    refreshSaved,
  } = useSavedActivities();
  const { rateActivity, refreshRatings } = useUserRatings();
  const runningRef = useRef(false);

  useEffect(() => {
    if (!isLoggedIn || !pendingIntent || runningRef.current) return;
    // Zapisane listy muszą być wiarygodne, inaczej „toggle" mógłby zdjąć
    // serce zamiast je dodać.
    if (pendingIntent.kind !== "rating" && isLoading) return;

    runningRef.current = true;
    const intent = pendingIntent;

    void (async () => {
      try {
        if (intent.kind === "favorite") {
          if (!isFavorite(intent.activityId)) {
            await toggleFavorite(intent.activityId, intent.slug);
          }
          await refreshSaved();
          toast.success("Zapisano w Twoich ulubionych");
        } else if (intent.kind === "wantToVisit") {
          if (!isWantToVisit(intent.activityId)) {
            await toggleWantToVisit(intent.activityId, intent.slug);
          }
          await refreshSaved();
          toast.success("Zapisano na liście „Chcę odwiedzić”");
        } else {
          await rateActivity(intent.activityId, intent.value);
          await refreshRatings();
          toast.success(`Zapisano Twoją ocenę: ${intent.value}/5`);
        }
      } catch {
        toast.error("Nie udało się zapisać. Spróbuj ponownie.");
      } finally {
        clearPendingIntent();
        runningRef.current = false;
      }
    })();
  }, [
    isLoggedIn,
    pendingIntent,
    isLoading,
    isFavorite,
    isWantToVisit,
    toggleFavorite,
    toggleWantToVisit,
    rateActivity,
    refreshSaved,
    refreshRatings,
    clearPendingIntent,
  ]);

  return null;
};

export default PendingIntentRunner;