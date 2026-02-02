import { useState } from "react";
import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  rating: number;
  existingReview?: string;
  onSubmit: (review: string) => Promise<void>;
  isEditing?: boolean;
}

const REVIEW_MAX_LENGTH = 500;

const ReviewContent = ({
  rating,
  existingReview,
  onSubmit,
  onClose,
  isEditing,
}: Omit<ReviewModalProps, "isOpen">) => {
  const [reviewText, setReviewText] = useState(existingReview || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(reviewText);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Rating display (read-only) */}
      <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-5 h-5 ${
                i < rating
                  ? "fill-primary text-primary"
                  : "text-muted-foreground/30"
              }`}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">Twoja ocena</span>
      </div>

      {/* Review textarea */}
      <div>
        <Textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value.slice(0, REVIEW_MAX_LENGTH))}
          placeholder="Co warto wiedzieć przed wizytą? (opcjonalnie)"
          className="resize-none min-h-[140px] text-base"
          maxLength={REVIEW_MAX_LENGTH}
          autoFocus
        />
        <p className="text-xs text-muted-foreground text-right mt-1.5">
          {reviewText.length}/{REVIEW_MAX_LENGTH}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Anuluj
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? "Publikuję..." : isEditing ? "Zapisz zmiany" : "Opublikuj opinię"}
        </Button>
      </div>
    </div>
  );
};

const ReviewModal = ({
  isOpen,
  onClose,
  rating,
  existingReview,
  onSubmit,
  isEditing = false,
}: ReviewModalProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="px-4 pb-8">
          <DrawerHeader className="flex items-center justify-between px-0 pt-4 pb-2">
            <DrawerTitle className="text-lg font-semibold">
              {isEditing ? "Edytuj opinię" : "Twoja opinia"}
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="-mr-2">
                <X className="w-5 h-5" />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <ReviewContent
            rating={rating}
            existingReview={existingReview}
            onSubmit={onSubmit}
            onClose={onClose}
            isEditing={isEditing}
          />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {isEditing ? "Edytuj opinię" : "Twoja opinia"}
          </DialogTitle>
        </DialogHeader>
        <ReviewContent
          rating={rating}
          existingReview={existingReview}
          onSubmit={onSubmit}
          onClose={onClose}
          isEditing={isEditing}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ReviewModal;
