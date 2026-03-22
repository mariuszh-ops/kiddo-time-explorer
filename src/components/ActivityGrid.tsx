import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal } from "lucide-react";
import ActivityCard from "@/components/ActivityCard";
import ActivityLoadError from "@/components/ActivityLoadError";
import SocialProofBanner from "@/components/SocialProofBanner";
import { Button } from "@/components/ui/button";
import { Activity } from "@/data/activities";
import { Filters, getActivityDistance } from "@/hooks/useActivityFilters";

interface ActivityGridProps {
  activities: Activity[];
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  isLoading?: boolean;
  hasError?: boolean;
  onRetry?: () => void;
  filters?: Filters;
}

const ITEMS_PER_PAGE = 18;

const ActivityGrid = ({ activities, hasActiveFilters, onClearFilters, isLoading, hasError, onRetry, filters = {} }: ActivityGridProps) => {
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Determine if social proof should be shown
  const showSocialProof = Boolean(filters.city && (filters.age || filters.type));

  // Select which activities get badges (top rated ones when social proof is visible)
  const badgeActivityIds = useMemo(() => {
    if (!showSocialProof) return new Set<number>();
    
    // Give badges to top 30% of activities by rating (max 6)
    const sorted = [...activities].sort((a, b) => b.rating - a.rating);
    const badgeCount = Math.min(6, Math.ceil(activities.length * 0.3));
    return new Set(sorted.slice(0, badgeCount).map(a => a.id));
  }, [activities, showSocialProof]);

  // Reset visible count when activities change (filter applied)
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [activities]);

  const visibleActivities = activities.slice(0, visibleCount);
  const hasMore = visibleCount < activities.length;
  const remainingCount = Math.min(ITEMS_PER_PAGE, activities.length - visibleCount);

  // Show error state if there's an error
  if (hasError && onRetry) {
    return <ActivityLoadError onRetry={onRetry} />;
  }

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + ITEMS_PER_PAGE, activities.length));
  };

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
              {/* Primary: scroll to filters */}
              <Button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full sm:w-auto"
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Zmień filtry
              </Button>
              
              {/* Secondary: clear all filters */}
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
        {/* Social proof banner - only when filters match criteria */}
        <SocialProofBanner filters={filters} resultCount={activities.length} />

        {/* Activity cards grid - 1 col on mobile, 2 on sm, 3 on md, 4 on lg */}
        <motion.div 
          layout
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
        >
          <AnimatePresence mode="popLayout">
            {visibleActivities.map((activity, index) => (
              <motion.div
                key={activity.id}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  y: 0,
                  transition: {
                    duration: 0.3,
                    delay: index < ITEMS_PER_PAGE ? index * 0.03 : 0,
                    ease: [0.25, 0.1, 0.25, 1]
                  }
                }}
                exit={{ 
                  opacity: 0, 
                  scale: 0.9,
                  transition: { duration: 0.2 }
                }}
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
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Load more button */}
        <AnimatePresence>
          {hasMore && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
              className="mt-8 text-center"
            >
              <button
                onClick={handleLoadMore}
                className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
              >
                Pokaż więcej ({remainingCount})
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default ActivityGrid;
