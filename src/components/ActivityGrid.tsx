import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { SlidersHorizontal, Map } from "lucide-react";
import { SlidersHorizontal, Map } from "lucide-react";
import ActivityCard from "@/components/ActivityCard";
import ActivityLoadError from "@/components/ActivityLoadError";
import SocialProofBanner from "@/components/SocialProofBanner";
import ActivityCardSkeleton from "@/components/ActivityCardSkeleton";
import { Button } from "@/components/ui/button";
import { Activity } from "@/data/activities";
import { FEATURES } from "@/lib/featureFlags";
import { Filters, getActivityDistance } from "@/hooks/useActivityFilters";

export interface ActivityGridProps {
  activities: Activity[];
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  isLoading?: boolean;
  hasError?: boolean;
  onRetry?: () => void;
  filters?: Filters;
  mapReturnAction?: () => void;
}

const ITEMS_PER_PAGE = 20;

/** Return current grid column count based on Tailwind breakpoints */
const useGridCols = () => {
  const [cols, setCols] = useState(4);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setCols(w >= 1024 ? 4 : w >= 768 ? 3 : w >= 640 ? 2 : 1);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return cols;
};

/** Round n up to the nearest multiple of cols, clamped to max */
const roundUp = (n: number, cols: number, max: number) =>
  Math.min(Math.ceil(n / cols) * cols, max);

const ActivityGrid = ({ activities, hasActiveFilters, onClearFilters, isLoading, hasError, onRetry, filters = {}, mapReturnAction }: ActivityGridProps) => {
  const [rawVisibleCount, setRawVisibleCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const cols = useGridCols();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Determine if social proof should be shown
  const showSocialProof = Boolean(filters.city && (filters.age || (filters.type && filters.type.length > 0)));

  // Select which activities get badges (top rated ones when social proof is visible)
  const badgeActivityIds = useMemo(() => {
    if (!showSocialProof) return new Set<number>();
    const sorted = [...activities].sort((a, b) => b.rating - a.rating);
    const badgeCount = Math.min(6, Math.ceil(activities.length * 0.3));
    return new Set(sorted.slice(0, badgeCount).map(a => a.id));
  }, [activities, showSocialProof]);

  // Reset visible count when activities change (filter applied)
  useEffect(() => {
    setRawVisibleCount(ITEMS_PER_PAGE);
  }, [activities]);

  const visibleCount = roundUp(rawVisibleCount, cols, activities.length);
  const visibleActivities = activities.slice(0, visibleCount);
  const hasMore = visibleCount < activities.length;

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    // Small delay for skeleton visibility
    setTimeout(() => {
      setRawVisibleCount((prev) => prev + ITEMS_PER_PAGE);
      setIsLoadingMore(false);
    }, 300);
  }, [hasMore, isLoadingMore]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // Show error state if there's an error
  if (hasError && onRetry) {
    return <ActivityLoadError onRetry={onRetry} />;
  }

  if (activities.length === 0) {
    return (
      <section className="bg-background py-8 md:py-12">
        <div className="container">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center py-16 md:py-24 text-center max-w-md mx-auto"
          >
            <h2 className="text-xl md:text-2xl font-serif text-foreground mb-3">
              Żadna z atrakcji nie pasuje do zadanych kryteriów.
            </h2>
            <p className="text-muted-foreground mb-8">
              Spróbuj zmienić lub usunąć niektóre filtry, aby zobaczyć więcej propozycji.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full sm:w-auto"
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Zmień filtry
              </Button>
              
              {hasActiveFilters && onClearFilters && (
                <button
                  onClick={onClearFilters}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
                >
                  Wyczyść wszystkie filtry
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  // Generate badge text based on filters
  const getBadgeText = (activityId: number): string | undefined => {
    if (!FEATURES.SOCIAL_PROOF) return undefined;
    if (!badgeActivityIds.has(activityId)) return undefined;
    
    if (filters.age && filters.city) {
      return "Popularne w tej grupie wiekowej";
    }
    if (filters.city) {
      const cityNames: Record<string, string> = {
        warszawa: "Warszawie",
        krakow: "Krakowie", 
        wroclaw: "Wrocławiu",
        gdansk: "Gdańsku",
        poznan: "Poznaniu",
      };
      const cityName = cityNames[filters.city] || filters.city;
      return `Często wybierane w ${cityName}`;
    }
    return undefined;
  };

  return (
    <section className="bg-background py-6 md:py-10">
      <div className="container">
        {/* Map return bar */}
        {mapReturnAction && (
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground font-medium">
              {activities.length} atrakcji z widoku mapy
            </span>
            <Button variant="outline" size="sm" onClick={mapReturnAction} className="gap-2">
              <Map className="w-4 h-4" />
              Wróć do mapy
            </Button>
          </div>
        )}
        {/* Social proof banner - only when filters match criteria */}
        <SocialProofBanner filters={filters} resultCount={activities.length} />

        {/* Activity cards grid */}
        <div 
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
        >
            {visibleActivities.map((activity) => (
              <div
                key={activity.id}
              >
                <ActivityCard
                  id={activity.id}
                  title={activity.title}
                  location={activity.location}
                  rating={activity.rating}
                  reviewCount={activity.reviewCount}
                  ageRange={activity.ageRange}
                  matchPercentage={activity.matchPercentage}
                  imageUrl={activity.imageUrl}
                  tags={activity.tags}
                  type={activity.type}
                  socialProofBadge={getBadgeText(activity.id)}
                  isEvent={activity.isEvent}
                  eventDate={activity.eventDate}
                  distanceKm={filters.city ? getActivityDistance(activity, filters.city) : null}
                  slug={activity.slug}
                  amenities={activity.amenities}
                  priceLevel={activity.priceLevel}
                  isRecommended={activity.isRecommended}
                  google_rating={activity.google_rating}
                  google_review_count={activity.google_review_count}
                />
              </div>
            ))}
        </div>

        {/* Loading skeleton row */}
        {isLoadingMore && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mt-4 md:mt-6">
            {Array.from({ length: cols }).map((_, i) => (
              <ActivityCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Sentinel for IntersectionObserver */}
        {hasMore && <div ref={sentinelRef} className="h-1" />}

        {/* All loaded message */}
        {!hasMore && activities.length > ITEMS_PER_PAGE && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-muted-foreground mt-10 text-sm"
          >
            To wszystkie atrakcje w tej okolicy 🎉
          </motion.p>
        )}
      </div>
    </section>
  );
};

export default ActivityGrid;
