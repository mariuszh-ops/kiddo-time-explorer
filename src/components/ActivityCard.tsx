import React, { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Star, Calendar, MapPinned, Navigation, Heart, Camera, Sparkles } from "lucide-react";
import LazyImage, { getCategoryPlaceholderColor } from "@/components/LazyImage";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedActivities } from "@/contexts/SavedActivitiesContext";
import { getPlaceholderImage } from "@/data/placeholders";
import { saveScrollPositionForPath } from "@/hooks/useScrollPosition";
import { FEATURES } from "@/lib/featureFlags";
import { getAmenityById } from "@/data/amenities";
import AmenityIcon from "@/components/AmenityIcon";
import { PRICE_LEVELS } from "@/data/activities";
import { cn } from "@/lib/utils";
import AuthRequiredModal from "@/components/AuthRequiredModal";

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
  isEvent?: boolean;
  eventDate?: string;
  distanceKm?: number | null;
  slug: string;
  amenities?: string[];
  priceLevel?: 0 | 1 | 2 | 3;
  isRecommended?: boolean;
  google_rating?: number;
  google_review_count?: number;
}

const formatReviewBucket = (count: number): string => {
  if (count < 50) return "do 50 ocen";
  if (count < 100) return "50+ ocen";
  if (count < 1000) return "100+ ocen";
  return "1000+ ocen";
};

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
  isEvent = false,
  eventDate,
  distanceKm,
  slug,
  amenities,
  priceLevel,
  isRecommended,
  google_rating,
  google_review_count,
}: ActivityCardProps) => {
  const { isLoggedIn, login } = useAuth();
  const { isFavorite: checkIsFavorite, toggleFavorite } = useSavedActivities();
  
  const [imgSrc, setImgSrc] = useState(imageUrl);
  const [imgError, setImgError] = useState(false);
  const fallbackImage = getPlaceholderImage(type, id);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [justToggled, setJustToggled] = useState(false);

  const isFav = checkIsFavorite(id);

  const handleImageError = useCallback(() => {
    if (imgSrc !== fallbackImage) {
      setImgSrc(fallbackImage);
    } else {
      setImgError(true);
    }
  }, [imgSrc, fallbackImage]);

  const handleClick = useCallback(() => {
    // Use window.location.pathname to avoid subscribing to router context
    saveScrollPositionForPath(window.location.pathname);
  }, []);

  const handleHeartClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      setIsAuthModalOpen(true);
      return;
    }

    const newState = await toggleFavorite(id);
    if (newState) {
      setJustToggled(true);
      setTimeout(() => setJustToggled(false), 300);
    }
  };

  const handleAuthAction = () => {
    login();
    setIsAuthModalOpen(false);
  };

  return (
    <>
      <Link to={`/atrakcje/${slug}`} onClick={handleClick}>
        <article className="group cursor-pointer rounded-xl transition-all duration-200 ease-out [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:shadow-[0_8px_25px_rgba(0,0,0,0.1)] active:opacity-90 active:duration-150">
          {/* Image */}
          <div className="relative aspect-[16/10] rounded-xl overflow-hidden mb-3 bg-muted">
            {imgError ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                <Camera className="w-8 h-8 mb-1" />
                <span className="text-xs">Brak zdjęcia</span>
              </div>
            ) : (
              <LazyImage
                src={imgSrc}
                alt={title}
                categoryColor={getCategoryPlaceholderColor(type)}
                className="w-full h-full object-cover transition-transform duration-200 ease-out [@media(hover:hover)]:group-hover:scale-[1.03]"
                onError={handleImageError}
              />
            )}

            {/* Events badge */}
            {FEATURES.EVENTS && isEvent && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5">
                <Badge
                  variant="secondary"
                  className="text-[10px] font-medium backdrop-blur-sm bg-amber-500/90 text-white border-0"
                >
                  <Calendar className="w-3 h-3 mr-1" />Wydarzenie
                </Badge>
              </div>
            )}

            {/* Heart button - right side */}
            <button
              onClick={handleHeartClick}
              className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-black/50 active:scale-90 opacity-80 group-hover:opacity-100"
              aria-label={isFav ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
            >
              <Heart
                className={cn(
                  "w-[18px] h-[18px] transition-all duration-200",
                  isFav ? "fill-red-500 text-red-500" : "fill-none text-white",
                  justToggled && "scale-125"
                )}
              />
            </button>

            {/* Match percentage badge - only visible when feature enabled */}
            {FEATURES.MATCH_PERCENTAGE && isLoggedIn && (
              <div className="absolute top-12 right-2">
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
            <div className="flex items-center gap-2">
              {google_rating != null && google_review_count != null ? (
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-lg">
                    <Star className="w-4 h-4 fill-primary text-primary" />
                    <span className="font-bold text-foreground">{google_rating.toFixed(1)}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    · {formatReviewBucket(google_review_count)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 bg-muted/60 px-2 py-1 rounded-lg">
                  <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">
                    Bez ocen Google
                  </span>
                </div>
              )}
            </div>

            <h3 className="font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {title}
            </h3>

            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground line-clamp-1 flex-1">
                {location}
              </p>
              {distanceKm != null && (
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground/70 whitespace-nowrap">
                  <Navigation className="w-3 h-3" />
                  ~{distanceKm.toFixed(1)} km
                </span>
              )}
            </div>

            {FEATURES.EVENTS && isEvent && eventDate && (
              <p className="flex items-center gap-1 text-xs text-amber-600">
                <Calendar className="w-3 h-3" />
                {eventDate}
              </p>
            )}

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


            {socialProofBadge && (
              <p className="text-xs text-muted-foreground/80 mt-1.5 italic">
                {socialProofBadge}
              </p>
            )}
          </div>
        </article>
      </Link>

      <AuthRequiredModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onGoogleClick={handleAuthAction}
        onEmailClick={handleAuthAction}
        onLoginClick={handleAuthAction}
      />
    </>
  );
};

export default React.memo(ActivityCard);
