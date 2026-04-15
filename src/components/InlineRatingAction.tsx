import { useState } from "react";
import { Star, Edit2, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRatings } from "@/contexts/UserRatingsContext";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import ReviewModal from "@/components/ReviewModal";

interface InlineRatingActionProps {
  activityId: number;
  onAuthRequired: () => void;
  compact?: boolean;
}

const InlineRatingAction = ({ activityId, onAuthRequired, compact = false }: InlineRatingActionProps) => {
  const { isLoggedIn } = useAuth();
  const { getUserRating, rateActivity, updateReview } = useUserRatings();
  
  const existingRating = getUserRating(activityId);
  
  const [hoveredStar, setHoveredStar] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const handleStarClick = async (rating: number) => {
    if (!isLoggedIn) {
      onAuthRequired();
      return;
    }
    
    setIsSubmitting(true);
    try {
      await rateActivity(activityId, rating, existingRating?.review);
      toast.success(existingRating ? "Zaktualizowano ocenę" : "Dziękujemy za ocenę!", {
        icon: <Star className="w-4 h-4 fill-current" />,
        duration: 2000,
      });
      setIsEditing(false);
    } catch (error) {
      toast.error("Nie udało się zapisać oceny");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewSubmit = async (review: string) => {
    try {
      if (existingRating) {
        await updateReview(activityId, review);
      } else {
        await rateActivity(activityId, existingRating?.rating || 0, review);
      }
      toast.success(existingRating?.review ? "Zaktualizowano opinię" : "Opinia została dodana!", {
        icon: <MessageSquarePlus className="w-4 h-4" />,
        duration: 2000,
      });
    } catch (error) {
      toast.error("Nie udało się zapisać opinii. Spróbuj ponownie.");
      throw error;
    }
  };

  const displayRating = existingRating?.rating || 0;
  const hasReview = Boolean(existingRating?.review);

  // Guest state - not logged in
  if (!isLoggedIn) {
    return (
      <div className="pt-4 border-t border-border/50">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">Oceń tę atrakcję</p>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onAuthRequired()}
                className="p-0.5 transition-transform hover:scale-110 active:scale-95"
                aria-label={`Oceń ${i + 1} z 5 gwiazdek`}
              >
                <Star className="w-7 h-7 md:w-8 md:h-8 text-muted-foreground/30 hover:text-muted-foreground/50 transition-colors" />
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Zaloguj się, aby ocenić
          </p>
        </div>
      </div>
    );
  }

  // Logged in - already rated (read-only view)
  if (existingRating && !isEditing) {
    return (
      <>
        <div className="pt-4 border-t border-border/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium text-foreground">Twoja ocena</p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 md:w-6 md:h-6 ${
                        i < displayRating
                          ? "fill-primary text-primary"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(existingRating.ratedAt, "d MMM yyyy", { locale: pl })}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Zmień
            </button>
          </div>
          
          {/* Review CTA section */}
          {hasReview ? (
            <div className="mt-3 pt-3 border-t border-border/30">
              <p className="text-sm text-foreground leading-relaxed mb-2">
                "{existingRating.review}"
              </p>
              <button
                onClick={() => setIsReviewModalOpen(true)}
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edytuj opinię
              </button>
            </div>
          ) : (
            <div className="mt-3 pt-3 border-t border-border/30">
              <p className="text-xs text-muted-foreground mb-2">
                Chcesz dodać krótką opinię dla innych rodziców?
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReviewModalOpen(true)}
                className="h-8 text-xs"
              >
                <MessageSquarePlus className="w-3.5 h-3.5 mr-1.5" />
                Dodaj opinię
              </Button>
            </div>
          )}
        </div>

        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          rating={existingRating.rating}
          existingReview={existingRating.review}
          onSubmit={handleReviewSubmit}
          isEditing={hasReview}
        />
      </>
    );
  }

  // Logged in - rating mode (new or editing)
  return (
    <div className="pt-4 border-t border-border/50">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">
            {existingRating ? "Zmień ocenę" : "Oceń tę atrakcję"}
          </p>
          {isEditing && (
            <button
              onClick={() => setIsEditing(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Anuluj
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => {
            const starValue = i + 1;
            const isFilled = starValue <= (hoveredStar || displayRating);
            
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleStarClick(starValue)}
                onMouseEnter={() => setHoveredStar(starValue)}
                onMouseLeave={() => setHoveredStar(0)}
                disabled={isSubmitting}
                className="p-0.5 transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
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
                      className={`w-7 h-7 md:w-8 md:h-8 transition-colors ${
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
          {isSubmitting && (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-5 h-5 ml-2 border-2 border-primary border-t-transparent rounded-full"
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Kliknij gwiazdkę, aby ocenić
        </p>
      </div>
    </div>
  );
};

export default InlineRatingAction;
