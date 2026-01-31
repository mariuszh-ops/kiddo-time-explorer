import { Link } from "react-router-dom";
import { Star, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  onRemove: (id: number) => void;
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
  const removeLabel = listType === "favorites" ? "Usuń z ulubionych" : "Usuń z listy";

  return (
    <article className="group relative transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-soft rounded-xl">
      {/* Remove button - top right corner */}
      <div className="absolute top-2 left-2 z-10">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 bg-background/90 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <X className="h-4 w-4" />
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
                onClick={() => onRemove(id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Usuń
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Link to={`/activity/${id}`}>
        {/* Image - 16:10 aspect ratio */}
        <div className="relative aspect-[16/10] rounded-xl overflow-hidden mb-3 transition-all duration-300 group-hover:brightness-105">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          
          {/* Match percentage badge */}
          <div className="absolute top-2 right-2">
            <Badge 
              variant="secondary" 
              className="bg-background/90 backdrop-blur-sm text-foreground text-xs font-medium"
            >
              {matchPercentage}% dopasowania
            </Badge>
          </div>
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
