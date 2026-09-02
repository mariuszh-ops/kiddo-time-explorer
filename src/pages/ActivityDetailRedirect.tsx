import { lazy, Suspense, useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import HomeSkeleton from "@/components/HomeSkeleton";
import { getActivities, ensureActivitiesLoaded } from "@/data/activities";
import { useDataStatus } from "@/hooks/useDataStatus";

const NotFound = lazy(() => import("@/pages/NotFound"));

// Legacy trasa /activity/:id — mapowanie id → slug wymaga katalogu,
// więc dociągamy go tylko na tej (rzadkiej) ścieżce.
const ActivityDetailRedirect = () => {
  const { id } = useParams<{ id: string }>();
  const status = useDataStatus();

  useEffect(() => {
    ensureActivitiesLoaded();
  }, []);

  if (status === "idle" || status === "loading") return null;

  const activity = getActivities().find((a) => a.id === Number(id));
  if (activity) {
    return <Navigate to={`/atrakcje/${activity.slug}`} replace />;
  }

  // Nieznane id: 404 zamiast cichego przekierowania na home — inaczej każdy
  // zepsuty link /activity/N oddaje botowi duplikat strony głównej (audyt 325: J-14).
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <NotFound />
    </Suspense>
  );
};

export default ActivityDetailRedirect;
