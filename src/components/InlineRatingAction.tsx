import { useState, useEffect, useCallback } from "react";
import { Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";

interface InlineRatingActionProps {
  activityId: number;
  onAuthRequired: () => void;
  compact?: boolean;
}

function loadRatings(): Record<string, number> {
  return getItem<Record<string, number>>(STORAGE_KEYS.INLINE_RATINGS, {});
}

function saveRating(activityId: number, rating: number) {
  const ratings = loadRatings();
  ratings[String(activityId)] = rating;
  setItem(STORAGE_KEYS.INLINE_RATINGS, ratings);
}

function getSavedRating(activityId: number): number | null {
  const ratings = loadRatings();
  return ratings[String(activityId)] ?? null;
}

function getTotalRatingsCount(): number {
  return Object.keys(loadRatings()).length;
}

function getActivityRatingsCount(activityId: number): number {
  // For now, count how many users rated this activity (localStorage is single-user, so 0 or 1)
  const saved = getSavedRating(activityId);
  return saved ? 1 : 0;
}

const InlineRatingAction = ({ activityId, onAuthRequired, compact = false }: InlineRatingActionProps) => {
  const { isLoggedIn } = useAuth();
  const [userRating, setUserRating] = useState<number | null>(null);
  const [hoveredStar, setHoveredStar] = useState(0);

  // Load saved rating on mount
  useEffect(() => {
    const saved = getSavedRating(activityId);
    if (saved) setUserRating(saved);
  }, [activityId]);

  const handleStarClick = (rating: number) => {
    if (!isLoggedIn) {
      onAuthRequired();
      return;
    }
    setUserRating(rating);
    saveRating(activityId, rating);
  };

  const hasRated = userRating !== null;
  const ratingCount = getActivityRatingsCount(activityId);
  const minRequired = 5;

  // Guest state
  if (!isLoggedIn) {
    return (
      <div className={compact ? "" : "py-3"}>
        <div className="flex flex-col gap-1.5">
          {!compact && <p className="text-sm font-medium text-foreground">Oceń tę atrakcję</p>}
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onAuthRequired()}
                className="p-0.5 cursor-pointer"
                aria-label={`Oceń ${i + 1} z 5 gwiazdek`}
              >
                <Star className={`${compact ? "w-5 h-5" : "w-6 h-6 md:w-7 md:h-7"} text-muted-foreground/30 hover:text-muted-foreground/50 transition-colors`} />
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Zaloguj się, aby ocenić</p>
        </div>
      </div>
    );
  }

  // Logged in
  return (
    <div className={compact ? "" : "py-3"}>
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-foreground">
          {hasRated ? "Dziękujemy za ocenę!" : "Oceń tę atrakcję"}
        </p>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => {
            const starValue = i + 1;
            const isFilled = starValue <= (hoveredStar || userRating || 0);

            return (
              <button
                key={i}
                type="button"
                onClick={() => handleStarClick(starValue)}
                onMouseEnter={() => setHoveredStar(starValue)}
                onMouseLeave={() => setHoveredStar(0)}
                className="p-0.5 transition-transform hover:scale-110 active:scale-95"
                aria-label={`Oceń ${starValue} z 5 gwiazdek`}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={isFilled ? "filled" : "empty"}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.1 }}
                  >
                    <Star
                      className={`${compact ? "w-5 h-5" : "w-6 h-6 md:w-7 md:h-7"} transition-colors ${
                        isFilled
                          ? "fill-primary text-primary"
                          : "text-muted-foreground/30 hover:text-muted-foreground/50"
                      }`}
                    />
                  </motion.div>
                </AnimatePresence>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {hasRated
            ? ratingCount >= minRequired
              ? `Ocena rodziców: ⭐ ${userRating!.toFixed(1)} (${ratingCount} opinii)`
              : `Twoja ocena: ${userRating}/5. Ocena rodziców pojawi się po zebraniu 5 opinii (${ratingCount}/${minRequired})`
            : "Kliknij gwiazdkę, aby ocenić"}
        </p>
      </div>
    </div>
  );
};

export default InlineRatingAction;
