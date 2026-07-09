import { useParams, Link, Navigate, useSearchParams } from "react-router-dom";
import { useMemo, useState, lazy, Suspense, useCallback } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ActivityGrid from "@/components/ActivityGrid";
import { Button } from "@/components/ui/button";
const MapView = lazy(() => import("@/components/MapView"));
import PageTransition from "@/components/PageTransition";
import SEOHead from "@/components/SEOHead";
import { filterOptions } from "@/data/activities";
import { FEATURES } from "@/lib/featureFlags";
import { LEGACY_CITY_TO_REGION, REGION_BY_SLUG, REGION_SLUGS } from "@/data/regions";
import {
  getCategoryConfig,
  resolveCityText,
  cityLabels,
} from "@/data/categoryPages";
import { useActivitiesInfinite } from "@/hooks/useActivitiesInfinite";
import CategoryFilterBar, { type SortOption } from "@/components/CategoryFilterBar";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import BreadcrumbCategoryDropdown from "@/components/BreadcrumbCategoryDropdown";
import BreadcrumbCityDropdown from "@/components/BreadcrumbCityDropdown";

const BASE_URL = "https://familyfun.pl";

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const pluralizeActivities = (n: number): string => {
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (abs === 1) return "atrakcja";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "atrakcje";
  return "atrakcji";
};

const CategoryPage = () => {
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const params = useParams<{ citySlug?: string; categorySlug?: string; slug?: string; regionSlug?: string }>();
  // Obsługiwane ścieżki:
  //   /atrakcje/:citySlug/:categorySlug
  //   /atrakcje/:slug (gdzie slug = miasto/województwo)
  //   /:regionSlug (krótki URL województwa)
  //   /:regionSlug/:categorySlug
  //   /kategoria/:categorySlug (kategoria we wszystkich województwach)
  const citySlug = params.regionSlug || params.citySlug || params.slug;
  const categorySlug = params.categorySlug;

  // Stary slug miasta → nowe województwo. Zachowujemy kategorię.
  if (citySlug && LEGACY_CITY_TO_REGION[citySlug]) {
    const target = categorySlug
      ? `/${LEGACY_CITY_TO_REGION[citySlug]}/${categorySlug}`
      : `/${LEGACY_CITY_TO_REGION[citySlug]}`;
    return <Navigate to={target} replace />;
  }

  // Kiedy trafiliśmy tu z /{region} lub /{region}/{type} — waliduj slug.
  if (params.regionSlug && !REGION_SLUGS.includes(params.regionSlug)) {
    return <Navigate to="/404" replace />;
  }

  const config = getCategoryConfig(categorySlug);
  const cityLabel = citySlug ? cityLabels[citySlug] : undefined;

  // URL-persisted filter state
  const [searchParams, setSearchParams] = useSearchParams();
  const urlType = searchParams.get("type") ?? undefined;
  const urlAmenities = useMemo(() => {
    const raw = searchParams.get("amenities");
    return raw ? raw.split(",").filter(Boolean) : [];
  }, [searchParams]);
  const urlMinRating = Number(searchParams.get("min") ?? "0") || 0;
  const urlSort = (searchParams.get("sort") as SortOption) || "rating";

  // If a category is set in the route, it wins over any URL ?type=
  const effectiveType = categorySlug ?? urlType;

  const {
    data: activities,
    total,
    loading,
    error,
    hasMore,
    loadingMore,
    loadMore,
  } = useActivitiesInfinite({
    region: citySlug,
    type: effectiveType,
    amenities: urlAmenities,
    minRating: urlMinRating,
    sort: urlSort,
  });

  const updateParams = useCallback(
    (patch: Record<string, string | undefined | null>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === undefined || v === null || v === "") next.delete(k);
            else next.set(k, v);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const clearAll = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const hasActiveFilters =
    (urlType && !categorySlug ? true : false) ||
    urlAmenities.length > 0 ||
    urlMinRating > 0 ||
    urlSort !== "rating";

  // Fallback config / cityLabel so we never render a completely blank page
  const effectiveConfig = config ?? {
    slug: categorySlug || "",
    emoji: "📍",
    label: categorySlug
      ? categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1)
      : "Atrakcje",
    seoTitle: "Atrakcje dla dzieci {city} — FamilyFun",
    seoDescription: "Odkryj atrakcje dla dzieci {city}.",
    h1: "Atrakcje dla dzieci {city}",
    description: "Sprawdzone miejsca na wspólny czas z dzieckiem {city}.",
    filterFn: () => false,
  };

  // Fallback etykieta: dla znanego regionu użyj label/locative z REGIONS,
  // dla trybu „tylko kategoria" (brak citySlug) — „w Polsce".
  const region = citySlug ? REGION_BY_SLUG[citySlug] : undefined;
  const effectiveCityLabel = cityLabel ?? {
    nominative: region?.label ?? (citySlug ?? "Polska"),
    locative: region?.locative ?? (citySlug ? citySlug : "Polsce"),
  };

  const isEmpty = !loading && activities.length === 0;

  const resolvedTitle = resolveCityText(effectiveConfig.seoTitle, citySlug || "");
  const resolvedDescription = resolveCityText(effectiveConfig.seoDescription, citySlug || "");
  const resolvedH1 = resolveCityText(effectiveConfig.h1, citySlug || "");
  const resolvedBodyDescription = resolveCityText(effectiveConfig.description, citySlug || "");

  const path = citySlug
    ? (categorySlug ? `/${citySlug}/${categorySlug}` : `/${citySlug}`)
    : `/kategoria/${categorySlug}`;

  // JSON-LD: ItemList + BreadcrumbList
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: resolvedH1,
    numberOfItems: activities.length,
    itemListElement: activities.slice(0, 10).map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${BASE_URL}/atrakcje/${a.slug}`,
      name: a.title,
    })),
  };

  const breadcrumbItems = [
    { name: "Strona główna", url: `${BASE_URL}/` },
    { name: effectiveCityLabel.nominative, url: `${BASE_URL}/atrakcje/${citySlug}` },
  ];
  if (categorySlug && effectiveConfig.slug) {
    breadcrumbItems.push({
      name: effectiveConfig.label,
      url: `${BASE_URL}${path}`,
    });
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };

  const combinedJsonLd = [itemListJsonLd, breadcrumbJsonLd];

  const countLabel = `${total} ${pluralizeActivities(total)} w ${capitalize(effectiveCityLabel.locative)}`;

  return (
    <PageTransition>
      <SEOHead
        title={resolvedTitle.replace(" | FamilyFun", "")}
        description={resolvedDescription}
        path={path}
        image={activities[0]?.imageUrl}
        jsonLd={combinedJsonLd as unknown as Record<string, unknown>}
      />
      <Header />
      <main className="pb-20 md:pb-0">
        <div className="container py-6">
          {/* Breadcrumbs: Strona główna > [City] > [Category ▾] */}
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Strona główna</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              {categorySlug ? (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbCityDropdown currentCitySlug={citySlug!} />
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbCategoryDropdown
                      citySlug={citySlug!}
                      activeCategorySlug={categorySlug}
                      currentLabel={filterOptions.type.find(t => t.value === categorySlug)?.label ?? effectiveConfig.label}
                    />
                  </BreadcrumbItem>
                </>
              ) : (
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-muted-foreground font-medium">
                    {effectiveCityLabel.nominative}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              )}
            </BreadcrumbList>
          </Breadcrumb>

          {/* H1 + Description */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-serif text-foreground mb-2">
              {resolvedH1}
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              {resolvedBodyDescription}
            </p>
          </div>

          {/* Filter bar */}
          <CategoryFilterBar
            type={effectiveType}
            typeLocked={Boolean(categorySlug)}
            onTypeChange={(v) => updateParams({ type: v })}
            amenities={urlAmenities}
            onAmenitiesChange={(next) =>
              updateParams({ amenities: next.length ? next.join(",") : undefined })
            }
            minRating={urlMinRating}
            onMinRatingChange={(v) => updateParams({ min: v > 0 ? String(v) : undefined })}
            sort={urlSort}
            onSortChange={(v) => updateParams({ sort: v === "rating" ? undefined : v })}
            hasActiveFilters={hasActiveFilters}
            onClearAll={clearAll}
          />

          {/* Count */}
          <p
            className="text-sm text-muted-foreground mb-4"
            aria-live="polite"
            role="status"
          >
            {loading ? "Wczytywanie atrakcji…" : countLabel}
          </p>

          {/* Error */}
          {error && !loading && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 text-destructive px-4 py-3 mb-4 text-sm">
              Nie udało się pobrać atrakcji. Spróbuj odświeżyć stronę.
            </div>
          )}

          {/* Empty state */}
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <h2 className="text-xl md:text-2xl font-serif text-foreground mb-3">
                Nic nie pasuje do wybranych filtrów
              </h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                Spróbuj poluzować filtry — zmień kategorię, obniż minimalną ocenę
                albo odznacz część udogodnień.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {hasActiveFilters && (
                  <Button onClick={clearAll}>Wyczyść filtry</Button>
                )}
                <Button asChild variant={hasActiveFilters ? "outline" : "default"}>
                  <Link to="/">Wróć na stronę główną</Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* View toggle */}
              {FEATURES.MAP_VIEW && (
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium border transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-foreground border-border hover:bg-muted"}`}
                  >
                    Lista
                  </button>
                  <button
                    onClick={() => setViewMode("map")}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium border transition-colors ${viewMode === "map" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-foreground border-border hover:bg-muted"}`}
                  >
                    Mapa
                  </button>
                </div>
              )}

              {/* Activity Grid or Map */}
              {FEATURES.MAP_VIEW && viewMode === "map" ? (
                <Suspense fallback={<div className="h-[60vh] bg-muted animate-pulse rounded-lg" />}>
                  <MapView activities={activities} filters={{ city: citySlug }} />
                </Suspense>
              ) : (
                <>
                  <h2 className="sr-only">Lista atrakcji</h2>
                  <ActivityGrid
                    activities={activities}
                    hasActiveFilters={hasActiveFilters}
                    onClearFilters={clearAll}
                    isLoading={loading}
                  />
                </>
              )}
            </>
          )}

          {/* Pokaż więcej (serwerowa paginacja co 24) */}
          {!isEmpty && !error && hasMore && (
            <div className="mt-8 flex justify-center">
              <Button
                onClick={loadMore}
                disabled={loadingMore}
                variant="outline"
                size="lg"
              >
                {loadingMore ? "Wczytywanie…" : `Pokaż więcej (${total - activities.length})`}
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </PageTransition>
  );
};

export default CategoryPage;
