import { Navigate, useParams } from "react-router-dom";
import { lazy, Suspense } from "react";
import { REGION_SLUGS, LEGACY_CITY_TO_REGION } from "@/data/regions";
import HomeSkeleton from "@/components/HomeSkeleton";

const CategoryPage = lazy(() => import("@/pages/CategoryPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

/**
 * Rozwiązuje krótkie ścieżki `/{region}` i `/{region}/{type}`:
 *  - znany slug województwa → renderuje CategoryPage
 *  - stary slug miasta (warszawa, krakow, …) → 301-podobny redirect
 *  - cokolwiek innego → 404
 */
const RegionRouteResolver = () => {
  const { regionSlug, categorySlug } = useParams<{ regionSlug: string; categorySlug?: string }>();

  if (regionSlug && LEGACY_CITY_TO_REGION[regionSlug]) {
    const target = categorySlug
      ? `/${LEGACY_CITY_TO_REGION[regionSlug]}/${categorySlug}`
      : `/${LEGACY_CITY_TO_REGION[regionSlug]}`;
    return <Navigate to={target} replace />;
  }

  if (!regionSlug || !REGION_SLUGS.includes(regionSlug)) {
    return (
      <Suspense fallback={<HomeSkeleton />}>
        <NotFound />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<HomeSkeleton />}>
      <CategoryPage />
    </Suspense>
  );
};

export default RegionRouteResolver;