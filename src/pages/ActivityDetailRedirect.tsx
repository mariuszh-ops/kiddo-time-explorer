import { Navigate, useParams } from "react-router-dom";
import { getActivities } from "@/data/activities";

const ActivityDetailRedirect = () => {
  const { id } = useParams<{ id: string }>();
  const activity = getActivities().find((a) => a.id === Number(id));

  if (activity) {
    return <Navigate to={`/atrakcje/${activity.slug}`} replace />;
  }

  return <Navigate to="/" replace />;
};

export default ActivityDetailRedirect;
