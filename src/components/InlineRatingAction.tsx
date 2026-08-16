import { useState } from "react";
import { Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRatings } from "@/contexts/UserRatingsContext";
import { useActivityRating } from "@/hooks/useActivityRating";
import { motion, AnimatePresence } from "framer-motion";

interface InlineRatingActionProps {
  activityId: number;
  onAuthRequired: () => void;
  compact?: boolean;
}

const InlineRatingAction = ({ activityId, onAuthRequired, compact = false }: InlineRatingActionProps) => {
  const { isLoggedIn } = useAuth();
  const { getUserRating, rateActivity } = useUserRatings();
  const [hoveredStar, setHoveredStar] = useState(0);
  const userRating = getUserRating(activityId)?.rating ?? null;
  const aggregate = useActivityRating(activityId, userRating);

  const handleStarClick = (rating: number) => {
    if (!isLoggedIn) {
      onAuthRequired();
      return;
    }
    void rateActivity(activityId, rating);
  };

  const hasRated = userRating !== null;

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
              className="min-h-11 min-w-11 h-11 w-11 p-0 flex items-center justify-center cursor-pointer"
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
                className="min-h-11 min-w-11 h-11 w-11 p-0 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
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
        {hasRated ? (
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>Twoja ocena: {userRating}/5</p>
            {aggregate.count > 0 && aggregate.avg != null && (
              <p>
                Ocena rodziców: ⭐ {aggregate.avg.toFixed(1)} ({aggregate.count} opinii)
              </p>
            )}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>Kliknij gwiazdkę, aby ocenić</p>
            {aggregate.count > 0 && aggregate.avg != null && (
              <p>
                Ocena rodziców: ⭐ {aggregate.avg.toFixed(1)} ({aggregate.count} opinii)
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InlineRatingAction;
