import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { Activity } from "@/data/activities";
import { catalogClient, mapCatalogRow, type CatalogRow } from "@/lib/catalogClient";
import ActivityCard from "@/components/ActivityCard";
import HorizontalCarousel from "@/components/HorizontalCarousel";

const TYPE_LABELS_GENITIVE: Record<string, string> = {
  "sala-zabaw": "sal zabaw",
  "plac-zabaw": "placów zabaw",
  "park-rozrywki": "parków rozrywki",
  "centra-rozrywki": "centrów rozrywki",
  "muzeum-teatr": "muzeów i teatrów",
  "sport": "obiektów sportowych",
  "zoo": "ogrodów zoologicznych",
  "inne": "atrakcji",
};

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

type Mode = "radius" | "region";
type Enriched = Activity & { distanceKm: number };

const SimilarAttractions = ({ activity }: SimilarAttractionsProps) => {
  const [candidates, setCandidates] = useState<Enriched[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCandidates(null);
    (async () => {
      // TWARDY warunek: ten sam type + to samo województwo (region).
      // Wykluczamy bieżącą atrakcję po place_id.
      let query = catalogClient
        .from("public_activities")
        .select("*")
        .eq("published", true)
        .eq("type", activity.type);
      if (activity.city) query = query.eq("region", activity.city);
      if (activity.place_id) query = query.neq("place_id", activity.place_id);
      const { data, error } = await query.limit(300);
      if (cancelled) return;
      if (error || !data) {
        setCandidates([]);
        return;
      }
      const mapped: Enriched[] = (data as CatalogRow[]).map((row, i) => {
        const a = mapCatalogRow(row, i);
        return {
          ...a,
          distanceKm: haversineKm(activity.latitude, activity.longitude, a.latitude, a.longitude),
        };
      });
      setCandidates(mapped);
    })();
    return () => { cancelled = true; };
  }, [activity.type, activity.city, activity.place_id, activity.latitude, activity.longitude]);

  const result = useMemo<{ items: Enriched[]; mode: Mode; radiusKm: number } | null>(() => {
    if (!candidates) return null;
    // Region ma <2 pozycji tego typu → ukrywamy sekcję.
    if (candidates.length < 2) return { items: [], mode: "region", radiusKm: 0 };

    const byDist = [...candidates].sort((a, b) => {
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      return (b.rating || 0) - (a.rating || 0);
    });

    const within5 = byDist.filter((a) => a.distanceKm <= 5);
    if (within5.length >= 3) return { items: within5.slice(0, 12), mode: "radius", radiusKm: 5 };

    const within10 = byDist.filter((a) => a.distanceKm <= 10);
    if (within10.length >= 3) return { items: within10.slice(0, 12), mode: "radius", radiusKm: 10 };

    // Fallback wojewódzki: rating desc, reviews_count desc.
    const byRating = [...candidates].sort((a, b) => {
      if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
      return (b.reviewCount || 0) - (a.reviewCount || 0);
    });
    return { items: byRating.slice(0, 12), mode: "region", radiusKm: 0 };
  }, [candidates]);

  if (!result || result.items.length === 0) return null;
  const { items, mode, radiusKm } = result;
  const typeLabel = TYPE_LABELS_GENITIVE[activity.type] || "atrakcji";
  const heading = mode === "radius"
    ? `Podobne atrakcje w pobliżu (${radiusKm} km)`
    : `Inne ${typeLabel} w województwie`;

  return (
    <section className="container mt-8 md:mt-10 mb-2">
      <h2 className="text-lg md:text-xl font-serif font-semibold text-foreground mb-4">
        {heading}
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
            {mode === "radius" && (
              <p className="mt-1 text-xs text-muted-foreground">
                {a.distanceKm.toFixed(1)} km od tej atrakcji
              </p>
            )}
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
