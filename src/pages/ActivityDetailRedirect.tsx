import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { getActivities, ensureActivitiesLoaded } from "@/data/activities";
import { useDataStatus } from "@/hooks/useDataStatus";

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

  return <Navigate to="/" replace />;
};

export default ActivityDetailRedirect;
