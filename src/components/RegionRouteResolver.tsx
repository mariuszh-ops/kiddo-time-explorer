import { Navigate, useLocation, useParams } from "react-router-dom";
import { lazy, Suspense } from "react";
import { REGION_SLUGS, LEGACY_CITY_TO_REGION } from "@/data/regions";
import HomeSkeleton from "@/components/HomeSkeleton";
import { kanonicznaSciezkaRegionu } from "@/lib/slugZeSciezki";

const CategoryPage = lazy(() => import("@/pages/CategoryPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

/** Slug, który routing potrafi obsłużyć: województwo albo stare miasto. */
const isKnownRegionSlug = (slug: string) =>
  REGION_SLUGS.includes(slug) || Boolean(LEGACY_CITY_TO_REGION[slug]);

/**
 * Rozwiązuje krótkie ścieżki `/{region}` i `/{region}/{type}`:
 *  - slug z wielkiej litery albo z polskimi znakami (np. /Malopolskie, /śląskie)
 *    → redirect na wersję kanoniczną (małe litery ASCII), kategoria też
 *  - znany slug województwa → renderuje CategoryPage
 *  - stary slug miasta (warszawa, krakow, …) → 301-podobny redirect
 *  - cokolwiek innego → 404
 */
const RegionRouteResolver = () => {
  const { regionSlug, categorySlug } = useParams<{ regionSlug: string; categorySlug?: string }>();
  const location = useLocation();

  // O-F-10: klawiatury mobilne i edytory tekstu same podnoszą pierwszą literę,
  // więc /Malopolskie lądowało na NotFound (HTTP 200, 0 kart). FMN-B83: rodzic
  // wpisuje też polskie znaki (/śląskie, /Łódzkie). Znany slug po złożeniu
  // (małe litery, bez ogonków) przekierowujemy na wersję kanoniczną, kategorię
  // w ścieżce składamy tak samo; query i hash (fbclid, utm_*, #top) przechodzą
  // w całości. Slug, który po złożeniu nadal jest nieznany, leci dalej na
  // NotFound; pętli nie ma, bo cel redirectu jest już złożony.
  const kanoniczna = kanonicznaSciezkaRegionu(regionSlug, categorySlug, isKnownRegionSlug);
  if (kanoniczna) {
    return (
      <Navigate
        to={{ pathname: kanoniczna, search: location.search, hash: location.hash }}
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
