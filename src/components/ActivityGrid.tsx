import { useState } from "react";
import ActivityCard from "@/components/ActivityCard";
import { Activity } from "@/data/activities";

interface ActivityGridProps {
  activities: Activity[];
}

const ITEMS_PER_PAGE = 18;

const ActivityGrid = ({ activities }: ActivityGridProps) => {
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const visibleActivities = activities.slice(0, visibleCount);
  const hasMore = visibleCount < activities.length;
  const remainingCount = Math.min(ITEMS_PER_PAGE, activities.length - visibleCount);

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + ITEMS_PER_PAGE, activities.length));
  };

  if (activities.length === 0) {
    return (
      <section className="bg-background py-8 md:py-12">
        <div className="container">
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              Nie znaleziono aktywności pasujących do wybranych filtrów.
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              Spróbuj zmienić kryteria wyszukiwania.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-background py-6 md:py-10">
      <div className="container">
        {/* Activity cards grid - 2 cols on mobile, 3 on tablet, 4 on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {visibleActivities.map((activity) => (
            <ActivityCard
              key={activity.id}
              title={activity.title}
              location={activity.location}
              rating={activity.rating}
              reviewCount={activity.reviewCount}
              ageRange={activity.ageRange}
              matchPercentage={activity.matchPercentage}
              imageUrl={activity.imageUrl}
              tags={activity.tags}
            />
          ))}
        </div>

        {/* Load more button */}
        {hasMore && (
          <div className="mt-8 text-center">
            <button
              onClick={handleLoadMore}
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              Pokaż więcej ({remainingCount})
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ActivityGrid;
