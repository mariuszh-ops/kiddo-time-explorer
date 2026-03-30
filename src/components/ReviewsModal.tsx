import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Review {
  author: string;
  rating: number;
  text: string;
  date: string;
}

interface ReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviews: Review[];
  activityName: string;
  averageRating: number;
}

const ReviewsModal = ({
  isOpen,
  onClose,
  reviews,
  activityName,
  averageRating,
}: ReviewsModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl font-serif pr-8">
            Opinie o {activityName}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 fill-primary text-primary" />
              <span className="font-bold text-foreground">{averageRating.toFixed(1)}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              na podstawie {reviews.length} opinii
            </span>
          </div>
        </DialogHeader>

        {/* Scrollable reviews list */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6 py-4">
          <div className="space-y-6">
            {reviews.map((review, index) => (
              <div 
                key={index} 
                className="pb-6 border-b border-border last:border-0 last:pb-0"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                      <span className="text-sm font-medium text-accent-foreground">
                        {review.author.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{anonymizeAuthor(review.author)}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">{review.date}</p>
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Google</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating
                            ? "fill-primary text-primary"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-foreground leading-relaxed">{review.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 pt-4 border-t border-border -mx-6 px-6">
          <Button variant="outline" className="w-full" onClick={onClose}>
            Zamknij
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewsModal;
