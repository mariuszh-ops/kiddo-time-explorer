import { Navigate, useParams } from "react-router-dom";
import { FEATURES } from "@/lib/featureFlags";
import { LEGACY_CITY_TO_REGION } from "@/data/regions";
import CategoryPage from "@/pages/CategoryPage";
import ActivityDetail from "@/pages/ActivityDetail";

/**
 * Resolves ambiguity between /atrakcje/:citySlug and /atrakcje/:slug.
 * If the first param matches an enabled city → render CategoryPage.
 * Otherwise → render ActivityDetail.
 */
const ActivityOrCategoryResolver = () => {
  const { slug } = useParams<{ slug: string }>();

  // Stary slug miasta → nowe województwo (np. /atrakcje/warszawa → /atrakcje/mazowieckie).
  if (slug && LEGACY_CITY_TO_REGION[slug]) {
    return <Navigate to={`/atrakcje/${LEGACY_CITY_TO_REGION[slug]}`} replace />;
  }

  const isCity = slug ? FEATURES.ENABLED_CITIES.includes(slug) : false;

  if (isCity) {
    return <CategoryPage />;
  }

  return <ActivityDetail />;
};

export default ActivityOrCategoryResolver;
