import { Link, useLocation } from "react-router-dom";
import { Star, Sparkles, Calendar, MapPinned, Navigation, Heart, Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedActivities } from "@/contexts/SavedActivitiesContext";
import { useState } from "react";
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
  isEvent = false,
  eventDate,
  distanceKm,
  slug,
  amenities,
  priceLevel,
  isRecommended,
}: ActivityCardProps) => {
  const { isLoggedIn, login } = useAuth();
  const { isFavorite: checkIsFavorite, toggleFavorite } = useSavedActivities();
  const routeLocation = useLocation();
  const hasReviews = reviewCount > 0;
  const [imgSrc, setImgSrc] = useState(imageUrl);
  const fallbackImage = getPlaceholderImage(type, id);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [justToggled, setJustToggled] = useState(false);

  const isFav = checkIsFavorite(id);

  const handleImageError = () => {
    if (imgSrc !== fallbackImage) {
      setImgSrc(fallbackImage);
    }
  };

  const handleClick = () => {
    saveScrollPositionForPath(routeLocation.pathname);
  };

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
        <article className="group cursor-pointer transition-all duration-300 ease-out md:hover:scale-[1.02] md:hover:shadow-soft rounded-xl active:scale-[0.98] active:opacity-90">
          {/* Image */}
          <div className="relative aspect-[16/10] rounded-xl overflow-hidden mb-3 transition-all duration-300 md:group-hover:brightness-105">
            <img
              src={imgSrc}
              alt={title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover md:group-hover:scale-105 transition-transform duration-500"
              onError={handleImageError}
            />

            {/* Price badge - hidden until better data; events badge preserved */}
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
              {hasReviews ? (
                <>
                  <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-lg">
                    <Star className="w-4 h-4 fill-primary text-primary" />
                    <span className="font-bold text-foreground">{rating.toFixed(1)}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    ({reviewCount} opinii)
                  </span>
                  {FEATURES.RECOMMENDED_BADGE && isRecommended && (
                    <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px] font-medium">
                      ✓ Polecane
                    </Badge>
                  )}
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

            {amenities && amenities.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1.5">
                {amenities.slice(0, 3).map((amenityId) => {
                  const amenity = getAmenityById(amenityId);
                  if (!amenity) return null;
                  return (
                    <div key={amenityId} className="text-muted-foreground" title={amenity.label}>
                      <AmenityIcon name={amenity.icon} className="w-3.5 h-3.5" />
                    </div>
                  );
                })}
                {amenities.length > 3 && (
                  <span className="text-xs text-muted-foreground">+{amenities.length - 3}</span>
                )}
              </div>
            )}

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

export default ActivityCard;
