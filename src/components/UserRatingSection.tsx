import { useState } from "react";
import { Star, Edit2, MessageSquarePlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserRatings } from "@/contexts/UserRatingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import ReviewModal from "@/components/ReviewModal";

interface UserRatingSectionProps {
  activityId: number;
  onAuthRequired: () => void;
}

const UserRatingSection = ({ activityId, onAuthRequired }: UserRatingSectionProps) => {
  const { isLoggedIn } = useAuth();
  const { getUserRating, rateActivity, updateReview, hasRated } = useUserRatings();
  
  const existingRating = getUserRating(activityId);
  
  const [isEditingRating, setIsEditingRating] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedRating, setSelectedRating] = useState(existingRating?.rating || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const handleStarClick = async (rating: number) => {
    if (!isLoggedIn) {
      onAuthRequired();
      return;
    }
    
    // If editing, just update selection
    if (isEditingRating) {
      setSelectedRating(rating);
      return;
    }
    
    // For new ratings, save immediately
    setSelectedRating(rating);
    setIsSubmitting(true);
    try {
      await rateActivity(activityId, rating);
      toast.success("Dziękujemy za ocenę!", {
        icon: <Star className="w-4 h-4 fill-current" />,
        duration: 2000,
      });
    } catch (error) {
      toast.error("Nie udało się zapisać oceny. Spróbuj ponownie.");
      setSelectedRating(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditRatingSubmit = async () => {
    if (selectedRating === 0) return;
    
    setIsSubmitting(true);
    try {
      await rateActivity(activityId, selectedRating, existingRating?.review);
      toast.success("Zaktualizowano ocenę", {
        icon: <Star className="w-4 h-4 fill-current" />,
        duration: 2000,
      });
      setIsEditingRating(false);
    } catch (error) {
      toast.error("Nie udało się zapisać oceny. Spróbuj ponownie.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewSubmit = async (review: string) => {
    try {
      if (existingRating) {
        await updateReview(activityId, review);
      } else {
        await rateActivity(activityId, selectedRating, review);
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

  const handleStartEditRating = () => {
    setIsEditingRating(true);
    setSelectedRating(existingRating?.rating || 0);
  };

  const handleCancelEditRating = () => {
    setIsEditingRating(false);
    setSelectedRating(existingRating?.rating || 0);
  };

  // Render existing rating (read-only view)
  if (existingRating && !isEditingRating) {
    const hasReview = Boolean(existingRating.review);
    
    return (
      <>
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 md:p-5">
          {/* Header with label */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Twoja ocena</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartEditRating}
              className="text-muted-foreground hover:text-foreground h-auto py-1 px-2 -mr-2"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1" />
              <span className="text-xs">Zmień</span>
            </Button>
          </div>
          
          {/* User's rating stars */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < existingRating.rating
                      ? "fill-primary text-primary"
                      : "text-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {format(existingRating.ratedAt, "d MMMM yyyy", { locale: pl })}
            </span>
          </div>
          
          {/* Review section */}
          {hasReview ? (
            <div className="space-y-2 border-t border-primary/10 pt-3">
              <p className="text-foreground text-sm leading-relaxed">
                "{existingRating.review}"
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReviewModalOpen(true)}
                className="text-primary hover:text-primary/80 -ml-2 h-auto py-1"
              >
                <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                Edytuj opinię
              </Button>
            </div>
          ) : (
            <div className="border-t border-primary/10 pt-3">
              <p className="text-sm text-muted-foreground mb-2">
                Chcesz dodać krótką opinię dla innych rodziców?
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReviewModalOpen(true)}
                className="h-9"
              >
                <MessageSquarePlus className="w-4 h-4 mr-1.5" />
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

  // Render rating form (new or editing rating)
  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-5">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        {isEditingRating ? "Zmień swoją ocenę" : "Oceń tę atrakcję"}
      </h3>
      
      {/* Star rating input */}
      <div className="flex items-center gap-1 mb-3">
        {Array.from({ length: 5 }).map((_, i) => {
          const starValue = i + 1;
          const isFilled = starValue <= (hoveredStar || selectedRating);
          
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
              <Star
                className={`w-8 h-8 transition-colors ${
                  isFilled
                    ? "fill-primary text-primary"
                    : "text-muted-foreground/40 hover:text-muted-foreground/60"
                }`}
              />
            </button>
          );
        })}
        {selectedRating > 0 && (
          <span className="ml-2 text-sm text-muted-foreground">
            {selectedRating}/5
          </span>
        )}
        {isSubmitting && (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="ml-2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full"
          />
        )}
      </div>
      
      {/* Edit mode actions */}
      {isEditingRating && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2 pt-2"
          >
            <Button
              onClick={handleEditRatingSubmit}
              disabled={selectedRating === 0 || isSubmitting}
              size="sm"
            >
              <Check className="w-4 h-4 mr-1.5" />
              Zapisz
            </Button>
            <Button variant="outline" size="sm" onClick={handleCancelEditRating}>
              Anuluj
            </Button>
          </motion.div>
        </AnimatePresence>
      )}
      
      {/* Helper text when no rating selected yet */}
      {selectedRating === 0 && !isEditingRating && (
        <p className="text-xs text-muted-foreground">
          Kliknij gwiazdkę, aby ocenić
        </p>
      )}
    </div>
  );
};

export default UserRatingSection;
