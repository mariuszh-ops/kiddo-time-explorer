import { Navigate, useLocation, useParams } from "react-router-dom";
import { lazy, Suspense } from "react";
import { REGION_SLUGS, LEGACY_CITY_TO_REGION } from "@/data/regions";
import HomeSkeleton from "@/components/HomeSkeleton";

const CategoryPage = lazy(() => import("@/pages/CategoryPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

/** Slug, który routing potrafi obsłużyć: województwo albo stare miasto. */
const isKnownRegionSlug = (slug: string) =>
  REGION_SLUGS.includes(slug) || Boolean(LEGACY_CITY_TO_REGION[slug]);

/**
 * Rozwiązuje krótkie ścieżki `/{region}` i `/{region}/{type}`:
 *  - slug z wielkiej litery (np. /Malopolskie) → redirect na wersję z małych
 *  - znany slug województwa → renderuje CategoryPage
 *  - stary slug miasta (warszawa, krakow, …) → 301-podobny redirect
 *  - cokolwiek innego → 404
 */
const RegionRouteResolver = () => {
  const { regionSlug, categorySlug } = useParams<{ regionSlug: string; categorySlug?: string }>();
  const location = useLocation();

  // O-F-10: klawiatury mobilne i edytory tekstu same podnoszą pierwszą literę,
  // więc /Malopolskie lądowało na NotFound (HTTP 200, 0 kart). Znany slug
  // zapisany wielkimi literami normalizujemy do wersji z małych — query i hash
  // (fbclid, utm_*, #top) przechodzą w całości. Slug, który po zamianie na małe
  // litery nadal jest nieznany, leci dalej na NotFound; pętli nie ma, bo cel
  // redirectu jest już w całości z małych liter.
  const lowerPathname = location.pathname.toLowerCase();
  if (regionSlug && lowerPathname !== location.pathname && isKnownRegionSlug(regionSlug.toLowerCase())) {
    return (
      <Navigate
        to={{ pathname: lowerPathname, search: location.search, hash: location.hash }}
        replace
      />
    );
  }

  // Stare slugi miast. `search` i `hash` idą dalej tak samo jak przy normalizacji
  // wielkości liter — inaczej /warszawa?utm_source=fb gubiłoby atrybucję kampanii
  // na samym przekierowaniu. Puste `search`/`hash` nie doklejają "?" ani "#".
  if (regionSlug && LEGACY_CITY_TO_REGION[regionSlug]) {
    const target = categorySlug
      ? `/${LEGACY_CITY_TO_REGION[regionSlug]}/${categorySlug}`
      : `/${LEGACY_CITY_TO_REGION[regionSlug]}`;
    return (
      <Navigate
        to={{ pathname: target, search: location.search, hash: location.hash }}
        replace
      />
    );
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
