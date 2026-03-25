import { useParams, Link, Navigate } from "react-router-dom";
import { useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ActivityGrid from "@/components/ActivityGrid";
import PageTransition from "@/components/PageTransition";
import SEOHead from "@/components/SEOHead";
import { mockActivities } from "@/data/activities";
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

const BASE_URL = "https://familyfun.pl";

const CategoryPage = () => {
  const { citySlug, categorySlug } = useParams<{ citySlug: string; categorySlug?: string }>();

  // Validate that citySlug is an enabled city — if not, this isn't a category page
  const isValidCity = citySlug ? FEATURES.ENABLED_CITIES.includes(citySlug) : false;

  const config = getCategoryConfig(categorySlug);
  const cityLabel = citySlug ? cityLabels[citySlug] : undefined;

  const activities = useMemo(() => {
    if (!citySlug || !config) return [];
    // Filter out events when feature is off
    const base = mockActivities.filter(a => FEATURES.EVENTS || !a.isEvent);
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
              {categorySlug ? (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to={`/atrakcje/${citySlug}`}>{cityLabel.nominative}</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{config.label}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              ) : (
                <BreadcrumbItem>
                  <BreadcrumbPage>{cityLabel.nominative}</BreadcrumbPage>
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

          {/* Activity Grid */}
          <ActivityGrid
            activities={activities}
            hasActiveFilters={false}
          />
        </div>
      </main>
      <Footer />
    </PageTransition>
  );
};

export default CategoryPage;
