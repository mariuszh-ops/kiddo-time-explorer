import { useParams, Link, Navigate } from "react-router-dom";
import { useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ActivityGrid from "@/components/ActivityGrid";
import MapView from "@/components/MapView";
import PageTransition from "@/components/PageTransition";
import SEOHead from "@/components/SEOHead";
import { getActivities } from "@/data/activities";
import { FEATURES } from "@/lib/featureFlags";
import {
  getCategoryConfig,
  getCategoryActivities,
  resolveCityText,
  cityLabels,
} from "@/data/categoryPages";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import BreadcrumbCategoryDropdown from "@/components/BreadcrumbCategoryDropdown";

const BASE_URL = "https://familyfun.pl";

const CategoryPage = () => {
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const params = useParams<{ citySlug?: string; categorySlug?: string; slug?: string }>();
  // Support both /atrakcje/:citySlug/:categorySlug and /atrakcje/:slug (where slug is a city)
  const citySlug = params.citySlug || params.slug;
  const categorySlug = params.categorySlug;

  // Validate that citySlug is an enabled city — if not, this isn't a category page
  const isValidCity = citySlug ? FEATURES.ENABLED_CITIES.includes(citySlug) : false;

  const config = getCategoryConfig(categorySlug);
  const cityLabel = citySlug ? cityLabels[citySlug] : undefined;

  const activities = useMemo(() => {
    if (!citySlug || !config) return [];
    // Filter out events when feature is off
    const base = getActivities().filter(a => FEATURES.EVENTS || !a.isEvent);
    return getCategoryActivities(base, citySlug, categorySlug);
  }, [citySlug, categorySlug, config]);

  // If citySlug is not a valid city, render nothing — let React Router fall through to ActivityDetail
  if (!isValidCity || !config || !cityLabel) {
    return null;
  }

  const resolvedTitle = resolveCityText(config.seoTitle, citySlug!);
  const resolvedDescription = resolveCityText(config.seoDescription, citySlug!);
  const resolvedH1 = resolveCityText(config.h1, citySlug!);
  const resolvedBodyDescription = resolveCityText(config.description, citySlug!);

  const path = categorySlug
    ? `/atrakcje/${citySlug}/${categorySlug}`
    : `/atrakcje/${citySlug}`;

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
    { name: cityLabel.nominative, url: `${BASE_URL}/atrakcje/${citySlug}` },
  ];
  if (categorySlug && config.slug) {
    breadcrumbItems.push({
      name: config.label,
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

  return (
    <PageTransition>
      <SEOHead
        title={resolvedTitle.replace(" | FamilyFun", "")}
        description={resolvedDescription}
        path={path}
        jsonLd={combinedJsonLd as unknown as Record<string, unknown>}
      />
      <Header />
      <main className="pb-20 sm:pb-0">
        <div className="container py-6">
          {/* Breadcrumbs */}
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Strona główna</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbCategoryDropdown
                  citySlug={citySlug!}
                  cityLabel={cityLabel.nominative}
                  activeCategorySlug={categorySlug}
                />
              </BreadcrumbItem>
              {categorySlug && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{config.label}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
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
            <MapView activities={activities} filters={{ city: citySlug }} />
          ) : (
            <ActivityGrid
              activities={activities}
              hasActiveFilters={false}
            />
          )}
        </div>
      </main>
      <Footer />
    </PageTransition>
  );
};

export default CategoryPage;
