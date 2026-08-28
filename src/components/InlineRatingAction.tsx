import { useState } from "react";
import { Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRatings } from "@/contexts/UserRatingsContext";
import { useActivityRating } from "@/hooks/useActivityRating";
import { trackEvent } from "@/lib/analytics";
import { motion, AnimatePresence } from "framer-motion";

interface InlineRatingActionProps {
  activityId: number;
  /** `rating` to liczba gwiazdek, którą gość kliknął (intencja przed logowaniem). */
  onAuthRequired: (rating?: number) => void;
  compact?: boolean;
  /** Rozróżnia zestawy gwiazdek dla czytników ekranu, np. „sekcja Oceny rodziców". */
  contextLabel?: string;
}

/** Polska forma liczby ocen: „1 ocena", „2 oceny", „5 ocen". */
const formatRatingCount = (count: number): string => {
  if (count === 1) return "1 ocena";
  const lastTwo = count % 100;
  const last = count % 10;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) {
    return `${count} oceny`;
  }
  return `${count} ocen`;
};

const InlineRatingAction = ({
  activityId,
  onAuthRequired,
  compact = false,
  contextLabel = "sekcja Oceny rodziców",
}: InlineRatingActionProps) => {
  const { isLoggedIn } = useAuth();
  const { getUserRating, rateActivity, aggregateRefreshKey } = useUserRatings();
  const [hoveredStar, setHoveredStar] = useState(0);
  const userRating = getUserRating(activityId)?.rating ?? null;
  const aggregate = useActivityRating(activityId, aggregateRefreshKey);
  const hasRated = userRating !== null;

  const handleStarClick = (rating: number) => {
    if (!isLoggedIn) {
      onAuthRequired(rating);
      return;
    }
    void rateActivity(activityId, rating);
  };

  const displayValue = hoveredStar || userRating || 0;
  const canShowAggregate = aggregate.count >= 5 && aggregate.avg != null;
  const formattedAvg = canShowAggregate
    ? aggregate.avg.toFixed(1).replace(".", ",")
    : null;

  const titleText = !isLoggedIn || !hasRated
    ? "Oceń tę atrakcję"
    : "Dziękujemy za ocenę!";
  const helperText = !isLoggedIn
    ? "Zaloguj się, aby ocenić"
    : hasRated
      ? `Twoja ocena: ${userRating}/5`
      : "Kliknij gwiazdkę, aby ocenić";

  return (
    <div className={compact ? "" : "py-3"}>
      <div className="flex flex-col gap-1.5">
        {!compact && (
          <p className="text-sm font-medium text-foreground">{titleText}</p>
        )}
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => {
            const starValue = i + 1;
            const isFilled = starValue <= displayValue;

            return (
              <button
                key={i}
                type="button"
                onClick={() => handleStarClick(starValue)}
                onMouseEnter={() => isLoggedIn && setHoveredStar(starValue)}
                onMouseLeave={() => setHoveredStar(0)}
                className="min-h-11 min-w-11 h-11 w-11 p-0 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                aria-label={`Oceń ${starValue} z 5 gwiazdek — ${contextLabel}`}
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
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>{helperText}</p>
          {canShowAggregate && (
            <p>
              Ocena rodziców: ⭐ {formattedAvg} ({formatRatingCount(aggregate.count)})
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InlineRatingAction;
