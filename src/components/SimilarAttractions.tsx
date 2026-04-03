import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Activity, getActivities } from "@/data/activities";
import ActivityCard from "@/components/ActivityCard";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface SimilarAttractionsProps {
  activity: Activity;
}

const SimilarAttractions = ({ activity }: SimilarAttractionsProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Compute nearby attractions with distances
  const { items, radiusKm } = useMemo(() => {
    const all = getActivities()
      .filter((a) => a.id !== activity.id && !a.isEvent && a.city === activity.city)
      .map((a) => ({
        ...a,
        distanceKm: haversineKm(activity.latitude, activity.longitude, a.latitude, a.longitude),
      }))
      .sort((a, b) => {
        // Same type first, then by distance
        const sameA = a.type === activity.type ? 0 : 1;
        const sameB = b.type === activity.type ? 0 : 1;
        if (sameA !== sameB) return sameA - sameB;
        return a.distanceKm - b.distanceKm;
      });

    const within5 = all.filter((a) => a.distanceKm <= 5);
    if (within5.length >= 3) {
      return { items: within5.slice(0, 12), radiusKm: 5 };
    }

    const within10 = all.filter((a) => a.distanceKm <= 10);
    if (within10.length >= 1) {
      return { items: within10.slice(0, 12), radiusKm: 10 };
    }

    return { items: all.slice(0, 12), radiusKm: 10 };
  }, [activity]);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, items]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector<HTMLElement>(":scope > *")?.offsetWidth || 300;
    const amount = direction === "left" ? -cardWidth : cardWidth;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <section className="container mt-8 md:mt-10 mb-2">
      <h2 className="text-lg md:text-xl font-serif font-semibold text-foreground mb-4">
        Podobne atrakcje w promieniu {radiusKm} km
      </h2>

      <div className="relative group">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-10 h-10 rounded-full bg-white border border-border shadow-md flex items-center justify-center hover:bg-muted transition-colors hidden md:flex"
            aria-label="Przewiń w lewo"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
        )}

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-10 h-10 rounded-full bg-white border border-border shadow-md flex items-center justify-center hover:bg-muted transition-colors hidden md:flex"
            aria-label="Przewiń w prawo"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        )}

        {/* Scrollable card strip */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 -mb-2"
          style={{ scrollPaddingLeft: 0 }}
        >
          {items.map((a) => (
            <div
              key={a.id}
              className="flex-shrink-0 snap-start"
              style={{
                width: "calc((100% - 3 * 1rem) / 4)", // desktop: 4 cards
              }}
            >
              <div className="w-full [--card-width:calc((100vw-2rem-0.5*1rem)/1.5)] sm:[--card-width:calc((100vw-3rem-1.5*1rem)/2.5)] lg:[--card-width:unset]">
                <ActivityCard
                  {...a}
                  distanceKm={null}
                  slug={a.slug}
                  amenities={a.amenities}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.distanceKm.toFixed(1)} km stąd
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SimilarAttractions;
