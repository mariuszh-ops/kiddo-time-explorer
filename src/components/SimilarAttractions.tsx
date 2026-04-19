import { useMemo, lazy, Suspense } from "react";
import { Activity, getActivities } from "@/data/activities";
import ActivityCard from "@/components/ActivityCard";
import HorizontalCarousel from "@/components/HorizontalCarousel";

const NearbyMiniMap = lazy(() => import("@/components/NearbyMiniMap"));

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
  const { items, radiusKm } = useMemo(() => {
    const all = getActivities()
      .filter((a) => a.id !== activity.id && !a.isEvent && a.city === activity.city)
      .map((a) => ({
        ...a,
        distanceKm: haversineKm(activity.latitude, activity.longitude, a.latitude, a.longitude),
      }))
      .sort((a, b) => {
        const sameA = a.type === activity.type ? 0 : 1;
        const sameB = b.type === activity.type ? 0 : 1;
        if (sameA !== sameB) return sameA - sameB;
        return a.distanceKm - b.distanceKm;
      });

    const within5 = all.filter((a) => a.distanceKm <= 5);
    if (within5.length >= 3) return { items: within5.slice(0, 12), radiusKm: 5 };

    const within10 = all.filter((a) => a.distanceKm <= 10);
    if (within10.length >= 1) return { items: within10.slice(0, 12), radiusKm: 10 };

    const fallbackItems = all.slice(0, 12);
    const maxDist = fallbackItems.length > 0
      ? Math.ceil(fallbackItems[fallbackItems.length - 1].distanceKm)
      : 10;
    return { items: fallbackItems, radiusKm: maxDist };
  }, [activity]);

  if (items.length === 0) return null;

  return (
    <section className="container mt-8 md:mt-10 mb-2">
      <h2 className="text-lg md:text-xl font-serif font-semibold text-foreground mb-4">
        Podobne atrakcje w promieniu {radiusKm} km
      </h2>
      <HorizontalCarousel visibleCards={[1.5, 2.5, 4]}>
        {items.map((a) => (
          <div key={a.id}>
            <ActivityCard
              {...a}
              distanceKm={null}
              slug={a.slug}
              amenities={a.amenities}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {a.distanceKm.toFixed(1)} km od tej atrakcji
            </p>
          </div>
        ))}
      </HorizontalCarousel>
      <Suspense fallback={<div className="h-[200px] md:h-[250px] mt-4 rounded-xl bg-muted animate-pulse" />}>
        <NearbyMiniMap
          currentActivity={{
            title: activity.title,
            latitude: activity.latitude,
            longitude: activity.longitude,
          }}
          nearbyActivities={items.map((a) => ({
            id: a.id,
            title: a.title,
            slug: a.slug,
            latitude: a.latitude,
            longitude: a.longitude,
            distanceKm: a.distanceKm,
          }))}
        />
      </Suspense>
    </section>
  );
};

export default SimilarAttractions;
