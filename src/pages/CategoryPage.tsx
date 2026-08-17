import { useParams, Link, Navigate, useSearchParams, useLocation } from "react-router-dom";
import { useMemo, useState, lazy, Suspense, useCallback, useEffect, useRef } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ActivityGrid from "@/components/ActivityGrid";
import { Button } from "@/components/ui/button";
const MapView = lazy(() => import("@/components/MapView"));
import PageTransition from "@/components/PageTransition";
import SEOHead from "@/components/SEOHead";
import { filterOptions } from "@/data/activities";
import { FEATURES } from "@/lib/featureFlags";
import { activityWord } from "@/lib/plural";
import { LEGACY_CITY_TO_REGION, REGION_BY_SLUG, REGION_SLUGS } from "@/data/regions";
import { REGION_SEO_DESCRIPTIONS } from "@/data/regionSeo";
import {
  getCategoryConfig,
  resolveCityText,
  cityLabels,
} from "@/data/categoryPages";
import { useActivitiesInfinite } from "@/hooks/useActivitiesInfinite";
import CategoryFilterBar, { type SortOption, AGE_RANGES } from "@/components/CategoryFilterBar";
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
import NotFound from "@/pages/NotFound";
import { useMapUrlState } from "@/hooks/useMapUrlState";

const BASE_URL = "https://familyfun.pl";


const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const pluralizeActivities = activityWord;

const CategoryPage = () => {
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

  // Waliduj slug województwa (16 województw) — nieznany → 404, nie pusty listing.
  if (citySlug && !REGION_SLUGS.includes(citySlug)) {
    return <NotFound />;
  }

  const config = getCategoryConfig(categorySlug);

  // Waliduj slug kategorii przeciwko znanej liście — nieznany → 404.
  if (categorySlug && !config) {
    return <NotFound />;
  }

  const cityLabel = citySlug ? cityLabels[citySlug] : undefined;

  // URL-persisted filter state
  const [searchParams, setSearchParams] = useSearchParams();
  const { viewMode, setViewMode, savedMapState, handleSaveMapState } = useMapUrlState(
    searchParams,
    setSearchParams,
  );
  const urlType = searchParams.get("type") ?? undefined;
  const urlAmenities = useMemo(() => {
    const raw = searchParams.get("amenities");
    return raw ? raw.split(",").filter(Boolean) : [];
  }, [searchParams]);
  const urlMinRating = Number(searchParams.get("min") ?? "0") || 0;
  // Domyślnie "reviews" (najpopularniejsze): rating desc wypychał na górę
  // obiekty 5.0★ z kilkudziesięcioma opiniami ponad znane kotwice (zoo/aquaparki).
  const urlSort = (searchParams.get("sort") as SortOption) || "reviews";
  // ?auto=0 → ukryj klasyfikowane automatycznie. Domyślnie widoczne (auto brak / auto=1).
  const includeUncertain = searchParams.get("auto") !== "0";
  // ?age=0-2 | 3-5 | 6-9 | 10-13 | 14-16
  const urlAge = searchParams.get("age") ?? undefined;
  const ageOption = urlAge ? AGE_RANGES.find((a) => a.value === urlAge) : undefined;
  // ?free=1 → zawężaj do atrakcji bez biletu.
  const onlyFree = searchParams.get("free") === "1";
  // ?search=zoo → fraza z wyszukiwarki w headerze (zawężona do tej strony).
  const urlSearch = searchParams.get("search")?.trim() ?? "";
  // ?page=2 → liczba doładowanych stron („Pokaż więcej") przywracana po powrocie wstecz.
  const initialPage = Math.max(0, Number(searchParams.get("page") ?? "0") || 0);

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
    page,
  } = useActivitiesInfinite(
    {
    region: citySlug,
    type: effectiveType,
    amenities: urlAmenities,
    minRating: urlMinRating,
    sort: urlSort,
    includeUncertain,
    ageMin: ageOption?.min,
    ageMax: ageOption?.max,
    onlyFree,
    search: urlSearch,
    },
    24,
    initialPage,
  );

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

  // Trzymaj numer strony w URL, żeby powrót wstecz odtworzył doładowane karty.
  useEffect(() => {
    const current = Number(searchParams.get("page") ?? "0") || 0;
    if (current !== page) {
      updateParams({ page: page > 0 ? String(page) : undefined });
    }
  }, [page, searchParams, updateParams]);

  // Zapamiętaj i przywróć pozycję scrolla dla tego widoku (klucz = ścieżka + filtry).
  const location = useLocation();
  const scrollKey = `ff:scroll:${location.pathname}?${new URLSearchParams(
    Array.from(searchParams.entries()).filter(([k]) => k !== "page"),
  ).toString()}`;
  const restoredRef = useRef(false);
  useEffect(() => {
    const onScroll = () => {
      // Nie nadpisuj zapamiętanej pozycji, dopóki jej nie przywrócimy —
      // wcześniejsze przewinięcia przeglądarki (clamp na krótkiej liście) zjadały wartość.
      if (!restoredRef.current) return;
      try {
        if (window.scrollY > 0) sessionStorage.setItem(scrollKey, String(window.scrollY));
      } catch { /* brak sessionStorage — pomijamy */ }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [scrollKey]);

  useEffect(() => {
    if (restoredRef.current || loading || activities.length === 0) return;
    // Czekaj, aż przywrócone strony faktycznie się doładują.
    if (page > 0 && activities.length <= 24) return;
    restoredRef.current = true;
    let saved = 0;
    try {
      saved = Number(sessionStorage.getItem(scrollKey) ?? "0") || 0;
    } catch { /* brak sessionStorage */ }
    if (saved > 0) {
      // Karty dociągają się progresywnie — ponawiaj skok, aż strona urośnie
      // do zapamiętanej wysokości (maks. ~1,5 s).
      let tries = 0;
      const timer = window.setInterval(() => {
        window.scrollTo(0, saved);
        tries += 1;
        if (Math.abs(window.scrollY - saved) <= 4 || tries >= 60) window.clearInterval(timer);
      }, 100);
    }
  }, [loading, activities.length, page, scrollKey]);

  const hasActiveFilters =
    (urlType && !categorySlug ? true : false) ||
    urlAmenities.length > 0 ||
    urlMinRating > 0 ||
    urlSort !== "rating" ||
    !includeUncertain ||
    Boolean(urlAge) ||
    onlyFree ||
    Boolean(urlSearch);

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

  // Kontekst wyszukiwania: chipy do usunięcia + wyjście na wyniki ogólnopolskie.
  const searchQS = urlSearch ? `?search=${encodeURIComponent(urlSearch)}` : "";
  const removeRegionTo = categorySlug
    ? `/kategoria/${categorySlug}${searchQS}`
    : `/${searchQS}`;
  const removeCategoryTo = citySlug ? `/${citySlug}${searchQS}` : `/${searchQS}`;
  const categoryLabel =
    filterOptions.type.find((t) => t.value === categorySlug)?.label ?? effectiveConfig.label;

  // Meta description: liczba atrakcji + krótki opis kategorii (docięty do ~160 znaków).
  const dynamicMetaDescription = (() => {
    // Strona województwa (bez kategorii) → unikalny opis regionu.
    const regionCopy = !categorySlug && citySlug ? REGION_SEO_DESCRIPTIONS[citySlug] : undefined;
    const base = `${countLabel}. ${regionCopy ?? resolvedDescription}`.trim();
    if (base.length <= 160) return base;
    const cut = base.slice(0, 160);
    const lastSpace = cut.lastIndexOf(" ");
    return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:—-]+$/, "")}…`;
  })();

  return (
    <PageTransition>
      <SEOHead
        title={resolvedTitle.replace(" | FamilyFun", "")}
        description={dynamicMetaDescription}
        path={path}
        image={activities[0]?.imageUrl}
        jsonLd={combinedJsonLd as unknown as Record<string, unknown>}
      />
      <Header />
      <main id="main-content" className="pb-20 md:pb-0">
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
              {categorySlug && citySlug ? (
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
                    {categorySlug
                      ? (filterOptions.type.find(t => t.value === categorySlug)?.label ?? effectiveConfig.label)
                      : effectiveCityLabel.nominative}
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
            onSortChange={(v) => updateParams({ sort: v === "reviews" ? undefined : v })}
            hasActiveFilters={hasActiveFilters}
            onClearAll={clearAll}
            includeUncertain={includeUncertain}
            onIncludeUncertainChange={(v) => updateParams({ auto: v ? undefined : "0" })}
            age={urlAge}
            onAgeChange={(v) => updateParams({ age: v ?? undefined })}
            onlyFree={onlyFree}
            onOnlyFreeChange={(v) => updateParams({ free: v ? "1" : undefined })}
          />

          {/* Count */}
          {urlSearch && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-sm text-muted-foreground">
                Wyniki dla „{urlSearch}” w:
              </span>
              {citySlug && (
                <Link
                  to={removeRegionTo}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-border bg-primary/10 text-primary text-sm hover:bg-primary/15 transition-colors"
                  aria-label={`Usuń filtr województwa: ${effectiveCityLabel.nominative}`}
                >
                  {effectiveCityLabel.nominative}
                  <span aria-hidden="true">×</span>
                </Link>
              )}
              {categorySlug && (
                <Link
                  to={removeCategoryTo}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-border bg-primary/10 text-primary text-sm hover:bg-primary/15 transition-colors"
                  aria-label={`Usuń filtr kategorii: ${categoryLabel}`}
                >
                  {categoryLabel}
                  <span aria-hidden="true">×</span>
                </Link>
              )}
              <Link to={`/${searchQS}`} className="text-sm text-primary hover:underline">
                Szukaj w całej Polsce
              </Link>
            </div>
          )}

          <p
            className="text-sm text-muted-foreground mb-4 min-h-5"
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
                  <MapView
                    activities={activities}
                    filters={{ city: citySlug }}
                    onViewModeChange={(mode) => setViewMode(mode)}
                    savedMapState={savedMapState}
                    onSaveMapState={handleSaveMapState}
                  />
                </Suspense>
              ) : (
                <>
                  <h2 className="sr-only">Lista atrakcji</h2>
                  <ActivityGrid
                    activities={activities}
                    hasActiveFilters={hasActiveFilters}
                    onClearFilters={clearAll}
                    isLoading={loading}
                    paginate={false}
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

          {/* Koniec listy */}
          {!isEmpty && !error && !hasMore && !loading && total > 24 && (
            <p className="text-center text-muted-foreground mt-10 text-sm">
              {categorySlug && !citySlug
                ? "To wszystkie atrakcje w tej kategorii"
                : citySlug && !categorySlug
                ? "To wszystkie atrakcje w tym województwie"
                : "To wszystkie atrakcje w tej kategorii"}
            </p>
          )}
        </div>
      </main>
      <Footer />
    </PageTransition>
  );
};

export default CategoryPage;
