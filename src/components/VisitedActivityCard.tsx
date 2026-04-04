import { Star, MapPin, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Activity } from "@/data/activities";
import { UserRating } from "@/contexts/UserRatingsContext";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

interface VisitedActivityCardProps {
  activity: Activity & { userRating: UserRating };
}

const VisitedActivityCard = ({ activity }: VisitedActivityCardProps) => {
  const { userRating } = activity;
  const formattedDate = format(userRating.ratedAt, "d MMMM yyyy", { locale: pl });
  
  // Truncate review for preview
  const reviewPreview = userRating.review && userRating.review.length > 100
    ? userRating.review.slice(0, 100) + "..."
    : userRating.review;

  return (
    <Link
      to={`/atrakcje/${activity.slug}`}
      className="block bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-soft transition-all group"
    >
      <div className="flex gap-3 p-3 md:p-4">
        {/* Image thumbnail */}
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden shrink-0 bg-muted">
          <img
            src={activity.imageUrl}
            alt={activity.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            {/* Title */}
            <h3 className="font-medium text-foreground text-sm md:text-base line-clamp-2 group-hover:text-primary transition-colors">
              {activity.title}
            </h3>
            
            {/* Location */}
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{activity.location}</span>
            </p>
          </div>
          
          {/* User's rating */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < userRating.rating
                      ? "fill-primary text-primary"
                      : "text-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              Oceniono w {formattedDate}
            </span>
          </div>
        </div>
        
        {/* Arrow indicator */}
        <div className="flex items-center shrink-0">
          <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
      
      {/* Review section */}
      <div className="px-3 md:px-4 pb-3 md:pb-4 -mt-1">
        {userRating.review ? (
          <div className="bg-accent/50 rounded-lg p-3">
            <p className="text-sm text-foreground leading-relaxed line-clamp-2">
              "{reviewPreview}"
            </p>
            <span className="text-xs text-primary mt-1.5 inline-block font-medium">
              Zobacz pełną opinię →
            </span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Brak opinii
          </p>
        )}
      </div>
    </Link>
  );
};

export default VisitedActivityCard;
