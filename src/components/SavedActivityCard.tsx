import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Star, X, AlertCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SavedActivityCardProps {
  id: number;
  title: string;
  location: string;
  rating: number;
  reviewCount: number;
  ageRange: string;
  matchPercentage: number;
  imageUrl: string;
  tags: string[];
  listType: "favorites" | "wantToVisit";
  onRemove: (id: number) => Promise<void> | void;
}

const SavedActivityCard = ({
  id,
  title,
  location,
  rating,
  reviewCount,
  ageRange,
  matchPercentage,
  imageUrl,
  tags,
  listType,
  onRemove,
}: SavedActivityCardProps) => {
  const { isLoggedIn } = useAuth();
  const [isRemoving, setIsRemoving] = useState(false);
  const [hasError, setHasError] = useState(false);
  const removeLabel = listType === "favorites" ? "Usuń z ulubionych" : "Usuń z listy";

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (hasError) {
      const timer = setTimeout(() => {
        setHasError(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [hasError]);

  const handleRemove = async () => {
    setIsRemoving(true);
    setHasError(false);
    
    try {
      await onRemove(id);
      // Success - component will be removed by parent
    } catch (error) {
      // Error - show inline message
      setHasError(true);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleRetry = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await handleRemove();
  };

  const handleDismissError = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHasError(false);
  };

  return (
    <article className="group relative transition-all duration-300 ease-out md:hover:scale-[1.02] md:hover:shadow-soft rounded-xl">
      {/* Remove button - top left corner */}
      <div className="absolute top-2 left-2 z-10">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 bg-background/90 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground transition-colors"
              onClick={(e) => e.stopPropagation()}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </motion.span>
              ) : (
                <X className="h-4 w-4" />
              )}
              <span className="sr-only">{removeLabel}</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {listType === "favorites" ? "Usuń z ulubionych?" : "Usuń z listy?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {listType === "favorites" 
                  ? `"${title}" zostanie usunięte z Twoich ulubionych.`
                  : `"${title}" zostanie usunięte z listy miejsc do odwiedzenia.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anuluj</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleRemove}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isRemoving}
              >
                {isRemoving ? "Usuwanie..." : "Usuń"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Inline error message */}
      <AnimatePresence>
        {hasError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-12 left-2 right-2 z-10"
          >
            <div className="bg-destructive/95 backdrop-blur-sm text-destructive-foreground rounded-lg p-2.5 shadow-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-tight">
                    Nie udało się usunąć z listy.
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      onClick={handleRetry}
                      className="text-xs underline underline-offset-2 hover:no-underline"
                    >
                      Spróbuj ponownie
                    </button>
                    <span className="text-destructive-foreground/50">·</span>
                    <button
                      onClick={handleDismissError}
                      className="text-xs text-destructive-foreground/70 hover:text-destructive-foreground"
                    >
                      Zamknij
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Link to={`/activity/${id}`}>
        {/* Image - 16:10 aspect ratio */}
        <div className="relative aspect-[16/10] rounded-xl overflow-hidden mb-3 transition-all duration-300 md:group-hover:brightness-105">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover md:group-hover:scale-105 transition-transform duration-500"
          />
          
          {/* Match percentage badge - only visible for logged-in users */}
          {isLoggedIn && (
            <div className="absolute top-2 right-2">
              <Badge 
                variant="secondary" 
                className="bg-background/90 backdrop-blur-sm text-foreground text-xs font-medium"
              >
                {matchPercentage}% dopasowania
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-2">
          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-lg">
              <Star className="w-4 h-4 fill-primary text-primary" />
              <span className="font-bold text-foreground">{rating.toFixed(1)}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              ({reviewCount} opinii)
            </span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>

          {/* Location */}
          <p className="text-sm text-muted-foreground line-clamp-1">
            {location}
          </p>

          {/* Tags row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge 
              variant="outline" 
              className="text-xs font-medium border-primary/30 text-primary"
            >
              {ageRange}
            </Badge>
            
            {tags.slice(0, 2).map((tag) => (
              <Badge 
                key={tag} 
                variant="outline" 
                className="text-xs font-normal"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </Link>
    </article>
  );
};

export default SavedActivityCard;
