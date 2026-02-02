import { useState } from "react";
import { Star, Edit2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUserRatings, UserRating } from "@/contexts/UserRatingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

interface UserRatingSectionProps {
  activityId: number;
  onAuthRequired: () => void;
}

const REVIEW_MAX_LENGTH = 500;

const UserRatingSection = ({ activityId, onAuthRequired }: UserRatingSectionProps) => {
  const { isLoggedIn } = useAuth();
  const { getUserRating, rateActivity, updateReview, hasRated } = useUserRatings();
  
  const existingRating = getUserRating(activityId);
  
  const [isEditing, setIsEditing] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedRating, setSelectedRating] = useState(existingRating?.rating || 0);
  const [showReviewField, setShowReviewField] = useState(false);
  const [reviewText, setReviewText] = useState(existingRating?.review || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStarClick = (rating: number) => {
    if (!isLoggedIn) {
      onAuthRequired();
      return;
    }
    setSelectedRating(rating);
    if (!existingRating) {
      setShowReviewField(true);
    }
  };

  const handleSubmit = async () => {
    if (selectedRating === 0) return;
    
    setIsSubmitting(true);
    try {
      await rateActivity(activityId, selectedRating, reviewText);
      toast.success(existingRating ? "Zaktualizowano ocenę" : "Dziękujemy za opinię!", {
        icon: <Star className="w-4 h-4 fill-current" />,
        duration: 2000,
      });
      setIsEditing(false);
      setShowReviewField(false);
    } catch (error) {
      toast.error("Nie udało się zapisać oceny. Spróbuj ponownie.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setSelectedRating(existingRating?.rating || 0);
    setReviewText(existingRating?.review || "");
    setShowReviewField(!!existingRating?.review);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedRating(existingRating?.rating || 0);
    setReviewText(existingRating?.review || "");
    setShowReviewField(false);
  };

  // Render existing rating (read-only view)
  if (existingRating && !isEditing) {
    const hasReview = Boolean(existingRating.review);
    
    return (
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 md:p-5">
        {/* Header with label */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Twoja ocena</h3>
        </div>
        
        {/* User's rating stars */}
        <div className="flex items-center gap-2 mb-3">
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
        
        {/* User's review or prompt to add one */}
        {hasReview ? (
          <div className="space-y-2">
            <p className="text-foreground text-sm leading-relaxed">
              {existingRating.review}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEditClick}
              className="text-primary hover:text-primary/80 -ml-2 h-auto py-1"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5" />
              Zobacz / edytuj opinię
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEditClick}
            className="text-primary hover:text-primary/80 -ml-2 h-auto py-1"
          >
            <Edit2 className="w-3.5 h-3.5 mr-1.5" />
            Dodaj opinię
          </Button>
        )}
      </div>
    );
  }

  // Render rating form (new or editing)
  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-5">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        {existingRating ? "Edytuj swoją opinię" : "Oceń tę atrakcję"}
      </h3>
      
      {/* Star rating input */}
      <div className="flex items-center gap-1 mb-4">
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
              className="p-0.5 transition-transform hover:scale-110 active:scale-95"
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
      </div>
      
      {/* Review text area (shown after rating is selected) */}
      <AnimatePresence>
        {(showReviewField || selectedRating > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Chcesz dodać krótką opinię dla innych rodziców? (opcjonalne)
                </label>
                <Textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value.slice(0, REVIEW_MAX_LENGTH))}
                  placeholder="Podziel się swoimi wrażeniami..."
                  className="resize-none min-h-[100px]"
                  maxLength={REVIEW_MAX_LENGTH}
                />
                <p className="text-xs text-muted-foreground text-right mt-1">
                  {reviewText.length}/{REVIEW_MAX_LENGTH}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleSubmit}
                  disabled={selectedRating === 0 || isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full"
                      />
                      Zapisuję...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {existingRating ? "Zapisz zmiany" : "Zapisz ocenę"}
                    </>
                  )}
                </Button>
                {existingRating && (
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Anuluj
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Helper text when no rating selected yet */}
      {selectedRating === 0 && !showReviewField && (
        <p className="text-xs text-muted-foreground">
          Kliknij gwiazdkę, aby ocenić
        </p>
      )}
    </div>
  );
};

export default UserRatingSection;
