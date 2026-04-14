import React, { useMemo } from "react";
import { Activity } from "@/data/activities";
import { cityLabels } from "@/data/categoryPages";
import SavedActivityCard from "@/components/SavedActivityCard";
import { Button } from "@/components/ui/button";
import { Navigation } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const cityMeta: Record<string, string> = {
  warszawa: "🧜‍♀️",
  slask: "⛏️",
  krakow: "🐉",
  wroclaw: "🤴",
  trojmiasto: "⚓",
  poznan: "🐐",
  lodz: "🎬",
};

const GOOGLE_MAPS_LIMIT = 7;

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestNeighborSort(activities: Activity[]): Activity[] {
  if (activities.length <= 1) return [...activities];
  const remaining = [...activities];
  const sorted: Activity[] = [remaining.shift()!];
  while (remaining.length > 0) {
    const last = sorted[sorted.length - 1];
    let minDist = Infinity;
    let minIdx = 0;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(last.latitude, last.longitude, remaining[i].latitude, remaining[i].longitude);
      if (d < minDist) {
        minDist = d;
        minIdx = i;
      }
    }
    sorted.push(remaining.splice(minIdx, 1)[0]);
  }
  return sorted;
}

function buildGoogleMapsUrl(activities: Activity[]): string {
  const points = activities
    .slice(0, GOOGLE_MAPS_LIMIT)
    .map((a) => `${a.latitude},${a.longitude}`);
  return `https://www.google.com/maps/dir/${points.join("/")}`;
}

interface TripPlannerFavoritesProps {
  favorites: Activity[];
  onRemove: (id: number) => Promise<void>;
}

const TripPlannerFavorites: React.FC<TripPlannerFavoritesProps> = ({
  favorites,
  onRemove,
}) => {
  const grouped = useMemo(() => {
    const map: Record<string, Activity[]> = {};
    for (const a of favorites) {
      const city = a.city || "inne";
      if (!map[city]) map[city] = [];
      map[city].push(a);
    }
    // Sort groups by count descending
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [favorites]);

  const handleNavigate = (activities: Activity[]) => {
    const sorted = nearestNeighborSort(activities);
    const url = buildGoogleMapsUrl(sorted);
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-8">
      {grouped.map(([city, activities]) => {
        const label = cityLabels[city]?.nominative || city;
        const emoji = cityMeta[city] || "📍";
        const count = activities.length;
        const overLimit = count > GOOGLE_MAPS_LIMIT;

        const navLabel = overLimit
          ? `Nawiguj przez ${GOOGLE_MAPS_LIMIT} pierwszych miejsc (limit Google Maps)`
          : `Nawiguj przez ${count} ${count === 1 ? "miejsce" : count < 5 ? "miejsca" : "miejsc"}`;

        return (
          <section key={city}>
            <h3 className="text-lg font-serif font-semibold text-foreground mb-4 flex items-center gap-2">
              <span>{emoji}</span> {label}
              <span className="text-sm font-normal text-muted-foreground">
                ({count})
              </span>
            </h3>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
            >
              <AnimatePresence mode="popLayout">
                {activities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      transition: { delay: index * 0.03 },
                    }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <SavedActivityCard
                      id={activity.id}
                      title={activity.title}
                      location={activity.location}
                      rating={activity.rating}
                      reviewCount={activity.reviewCount}
                      ageRange={activity.ageRange}
                      matchPercentage={activity.matchPercentage}
                      imageUrl={activity.imageUrl}
                      tags={activity.tags}
                      listType="favorites"
                      onRemove={onRemove}
                      type={activity.type}
                      slug={activity.slug}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      disabled={count === 0}
                      onClick={() => handleNavigate(activities)}
                    >
                      <Navigation className="w-4 h-4" />
                      {navLabel}
                    </Button>
                  </div>
                </TooltipTrigger>
                {count === 0 && (
                  <TooltipContent>
                    Dodaj atrakcje do ulubionych
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </section>
        );
      })}
    </div>
  );
};

export default TripPlannerFavorites;
