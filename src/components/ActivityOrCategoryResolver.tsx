import { Navigate, useLocation, useParams } from "react-router-dom";
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
  const location = useLocation();

  // Stary slug miasta → nowe województwo (np. /atrakcje/warszawa → /atrakcje/mazowieckie).
  // Query i hash (utm_*, fbclid) idą dalej jak w RegionRouteResolver (GL-6-007).
  if (slug && LEGACY_CITY_TO_REGION[slug]) {
    return (
      <Navigate
        to={{
          pathname: `/atrakcje/${LEGACY_CITY_TO_REGION[slug]}`,
          search: location.search,
          hash: location.hash,
        }}
        replace
      />
    );
  }

  const isCity = slug ? FEATURES.ENABLED_CITIES.includes(slug) : false;

  if (isCity) {
    return <CategoryPage />;
  }

  return <ActivityDetail />;
};

export default ActivityOrCategoryResolver;
