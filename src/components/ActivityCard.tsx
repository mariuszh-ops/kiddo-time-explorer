import { trackEvent } from "@/lib/analytics";
import React, { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Star, Calendar, MapPinned, Navigation, Heart, Camera, HelpCircle } from "lucide-react";
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

const CATEGORY_LABELS: Record<string, string> = {
  "sala-zabaw": "Sala zabaw",
  "plac-zabaw": "Plac zabaw",
  "park-rozrywki": "Park rozrywki",
  "centra-rozrywki": "Centrum rozrywki",
  "muzeum-teatr": "Muzeum / teatr",
  "sport": "Sport",
  "zoo": "Zoo",
  "park": "Park i natura",
  "inne": "Inne",
};

const HIDDEN_TAGS = new Set(["W pomieszczeniu", "Na zewnątrz"]);

const formatReviewCount = (count: number): string => {
  const formatted = new Intl.NumberFormat("pl-PL").format(count);
  const suffix = count === 1 ? "opinia" : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20) ? "opinie" : "opinii";
  return `${formatted} ${suffix}`;
};

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
  priority?: boolean;
  uncertain?: boolean;
  isFree?: boolean;
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
  google_rating,
  google_review_count,
  priority = false,
  uncertain = false,
  isFree = false,
}: ActivityCardProps) => {
  const { isLoggedIn, signInWithGoogle } = useAuth();
  const { isFavorite: checkIsFavorite, toggleFavorite } = useSavedActivities();
  
  const [imgSrc, setImgSrc] = useState(imageUrl);
  const [imgError, setImgError] = useState(false);
  const fallbackImage = getPlaceholderImage(type, id);
  // Unified rating source: prefer explicit google_* (spójne z detalem),
  // z fallbackiem na rating/reviewCount z katalogu.
  const displayRating = google_rating ?? (rating > 0 ? rating : null);
  const displayReviewCount = google_review_count ?? (reviewCount > 0 ? reviewCount : null);
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
    trackEvent("activity_card_click", { activityId: id, slug });
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
    trackEvent("favorite_toggle", { activityId: id, state: newState ? "add" : "remove" });
    if (newState) {
      setJustToggled(true);
      setTimeout(() => setJustToggled(false), 300);
    }
  };

  const handleAuthAction = async () => {
    await signInWithGoogle();
    setIsAuthModalOpen(false);
  };

  return (
    <>
      <Link to={`/atrakcje/${slug}`} onClick={handleClick}>
        <article className="group cursor-pointer rounded-xl transition-all duration-200 ease-out [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:shadow-[0_8px_25px_rgba(0,0,0,0.1)] active:opacity-90 active:duration-150">
          {/* Image */}
          <div
            className={cn(
              "relative aspect-[16/10] rounded-xl overflow-hidden mb-3 bg-muted",
              uncertain && "outline-dashed outline-1 outline-muted-foreground/40 outline-offset-[-1px]",
            )}
          >
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
                priority={priority}
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

            {/* Uncertain (AI-classified) marker */}
            {uncertain && (
              <div
                className="absolute bottom-2 left-2 z-10 w-7 h-7 rounded-full bg-background/85 backdrop-blur-sm border border-border/60 flex items-center justify-center shadow-sm"
                title="Zaklasyfikowana automatycznie — może wymagać weryfikacji"
                aria-label="Zaklasyfikowana automatycznie — może wymagać weryfikacji"
                role="img"
              >
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
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
            {displayRating != null && displayReviewCount != null && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-lg">
                    <Star className="w-4 h-4 fill-primary text-primary" />
                    <span className="font-bold text-foreground">{displayRating.toFixed(1)}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    · {formatReviewCount(displayReviewCount)}
                  </span>
                </div>
              </div>
            )}

            <h3 className="font-semibold text-gray-800 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {title}
            </h3>

            {CATEGORY_LABELS[type] && (
              <p className={cn("text-sm text-muted-foreground", uncertain && "italic opacity-70")}>
                {CATEGORY_LABELS[type]}
                {uncertain && <span className="ml-1 text-[11px]">· auto</span>}
              </p>
            )}

            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground line-clamp-1 flex-1">
                {location}
              </p>
              {distanceKm != null && (
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground whitespace-nowrap">
                  <Navigation className="w-3 h-3" />
                  ~{distanceKm.toFixed(1)} km
                </span>
              )}
            </div>

            {FEATURES.EVENTS && isEvent && eventDate && (
              <p className="flex items-center gap-1 text-xs text-amber-700">
                <Calendar className="w-3 h-3" />
                {eventDate}
              </p>
            )}

            <div className="flex items-center gap-1.5 flex-wrap">
              {isFree && (
                <Badge
                  variant="outline"
                  className="text-xs font-medium border-emerald-300 text-emerald-800 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-200 dark:bg-emerald-950/40"
                  aria-label="Wstęp wolny"
                >
                  Wstęp wolny
                </Badge>
              )}
              {ageRange && (
                <Badge
                  variant="outline"
                  className="text-xs font-medium border-primary/30 text-primary"
                  aria-label={`Rekomendowany wiek: ${ageRange}`}
                >
                  {ageRange}
                </Badge>
              )}
              {tags.filter((tag) => !HIDDEN_TAGS.has(tag)).slice(0, 2).map((tag) => (
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
              <p className="text-xs text-muted-foreground mt-1.5 italic">
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
