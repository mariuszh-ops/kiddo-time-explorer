import { Link } from "react-router-dom";
import { Star, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { getPlaceholderImage } from "@/data/placeholders";

interface ActivityCardProps {
  id: number;
  title: string;
  location: string;
  rating: number;
  reviewCount: number;
  ageRange: string;
  matchPercentage: number;
  imageUrl: string;
  tags: string[];
  type?: string;
  socialProofBadge?: string;
}

const ActivityCard = ({
  id,
  title,
  location,
  rating,
  reviewCount,
  ageRange,
  matchPercentage,
  imageUrl,
  tags,
  type = "inne",
  socialProofBadge,
}: ActivityCardProps) => {
  const { isLoggedIn } = useAuth();
  const hasReviews = reviewCount > 0;
  const [imgSrc, setImgSrc] = useState(imageUrl);
  const fallbackImage = getPlaceholderImage(type, id);

  const handleImageError = () => {
    if (imgSrc !== fallbackImage) {
      setImgSrc(fallbackImage);
    }
  };

  return (
    <Link to={`/activity/${id}`}>
      <article className="group cursor-pointer transition-all duration-300 ease-out md:hover:scale-[1.02] md:hover:shadow-soft rounded-xl active:scale-[0.98] active:opacity-90">
      {/* Image - 16:10 aspect ratio (rectangular, not square) */}
      <div className="relative aspect-[16/10] rounded-xl overflow-hidden mb-3 transition-all duration-300 md:group-hover:brightness-105">
        <img
          src={imgSrc}
          alt={title}
          className="w-full h-full object-cover md:group-hover:scale-105 transition-transform duration-500"
          onError={handleImageError}
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
        {/* Rating or New badge */}
        <div className="flex items-center gap-2">
          {hasReviews ? (
            <>
              <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-lg">
                <Star className="w-4 h-4 fill-primary text-primary" />
                <span className="font-bold text-foreground">{rating.toFixed(1)}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                ({reviewCount} opinii)
              </span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1 bg-accent px-2 py-1 rounded-lg">
                <Sparkles className="w-4 h-4 text-accent-foreground" />
                <span className="font-medium text-accent-foreground text-sm">Nowa atrakcja</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Brak opinii rodziców
              </span>
            </>
          )}
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
          {/* Age range - always first */}
          <Badge 
            variant="outline" 
            className="text-xs font-medium border-primary/30 text-primary"
          >
            {ageRange}
          </Badge>
          
          {/* Other tags */}
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

        {/* Social proof badge - subtle, only when context allows */}
        {socialProofBadge && (
          <p className="text-xs text-muted-foreground/80 mt-1.5 italic">
            {socialProofBadge}
          </p>
        )}
      </div>
      </article>
    </Link>
  );
};

export default ActivityCard;
