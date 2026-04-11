import { lazy, Suspense, useRef, useCallback, useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import FilterBar from "@/components/FilterBar";
import ActivityGrid from "@/components/ActivityGrid";
import ActivityCard from "@/components/ActivityCard";
import DiscoverSections from "@/components/DiscoverSections";
import PageTransition from "@/components/PageTransition";
import SEOHead from "@/components/SEOHead";
import { useActivityFilters } from "@/hooks/useActivityFilters";
import { useGeolocationCity } from "@/hooks/useGeolocationCity";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { FEATURES } from "@/lib/featureFlags";
import { cn } from "@/lib/utils";
import OnboardingModal from "@/components/OnboardingModal";
const MapView = lazy(() => import("@/components/MapView"));
import DecisionChips from "@/components/DecisionChips";

const Index = () => {
  const listingRef = useRef<HTMLDivElement>(null);
  const { detectCity } = useGeolocationCity();
  
  // Scroll position restoration - isScrollRestored ensures content only shows after scroll is set
  const { isScrollRestored } = useScrollPosition();
  
  // Initialize filters without initial city - city is set explicitly on explore
  const { filters, searchQuery, setSearchQuery, updateFilter, toggleArrayFilter, clearAllFilters, filteredActivities, filterCounts } = useActivityFilters();

  // View mode: grid or map (sync with URL param from bottom nav)
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"grid" | "map">(
    searchParams.get("view") === "map" ? "map" : "grid"
  );

  // React to ?view=map param changes (e.g. from bottom nav)
  useEffect(() => {
    if (searchParams.get("view") === "map") {
      setViewMode("map");
    }
  }, [searchParams]);

  // No longer reset to grid when city is cleared — map works without city filter

  // Check if any filters are active - derived directly from filter state
  const hasActiveFilters = filterCounts.hasAnyFilter;

  // Top rated activities for homepage recommendations (when no filters active)
  const topRatedActivities = useMemo(() => {
    if (!FEATURES.TOP_RATED_HOMEPAGE || hasActiveFilters) return [];
    return [...filteredActivities]
      .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
      .slice(0, 8);
  }, [filteredActivities, hasActiveFilters]);

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    if (FEATURES.ONBOARDING && !localStorage.getItem('ff_onboarding_seen')) {
      setShowOnboarding(true);
    }
  }, []);

  // Auto-restore saved city on first load — disabled for now (no auto-geonav)
  // useEffect(() => {
  //   const savedCity = localStorage.getItem('ff_user_city');
  //   if (savedCity && FEATURES.ENABLED_CITIES.includes(savedCity) && !filters.city) {
  //     updateFilter("city", savedCity);
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  const handleOnboardingComplete = (selectedCity?: string) => {
    localStorage.setItem('ff_onboarding_seen', 'true');
    setShowOnboarding(false);
    if (selectedCity) {
      localStorage.setItem('ff_user_city', selectedCity);
      updateFilter("city", selectedCity);
      // Scroll to listing
      setTimeout(() => {
        if (listingRef.current) {
          const headerHeight = 56;
          const elementPosition = listingRef.current.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: elementPosition - headerHeight, behavior: "smooth" });
        }
      }, 100);
    }
  };

  const handleExplore = useCallback(async () => {
    // Geolocation auto-detect disabled — just scroll to results
    // if (FEATURES.ENABLED_CITIES.length > 1) {
    //   const city = await detectCity();
    //   updateFilter("city", city);
    // } else {
    //   updateFilter("city", FEATURES.ENABLED_CITIES[0] || "warszawa");
    // }
    
    if (listingRef.current) {
      const headerHeight = 56;
      const elementPosition = listingRef.current.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: elementPosition - headerHeight, behavior: "smooth" });
    }
  }, []);

  return (
    <PageTransition>
      <SEOHead
        title="Atrakcje dla dzieci — sprawdzone przez rodziców"
        description="Odkryj najlepsze atrakcje dla rodzin z dziećmi w Warszawie, Krakowie, Wrocławiu, Trójmieście, Poznaniu, Łodzi i na Śląsku. Opinie i oceny od rodziców."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "FamilyFun",
          "url": "https://familyfun.pl",
          "description": "Sprawdzone atrakcje dla rodzin z dziećmi w Warszawie",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://familyfun.pl/?search={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        }}
      />
      <main
        className="min-h-screen bg-background pb-20 md:pb-0 transition-opacity duration-150"
        style={{ 
          opacity: isScrollRestored ? 1 : 0
        }}
      >
      {/* Global header with navigation */}
      <Header />

      {/* Hero section — hidden in map view */}
      <div
        className={cn(
          "transition-all duration-300 overflow-hidden",
          viewMode === "map" ? "max-h-0 opacity-0" : "max-h-[1000px] opacity-100"
        )}
      >
        <HeroSection onExplore={handleExplore} />
      </div>

      {/* Sticky filter bar - this is the scroll target */}
      <div ref={listingRef} className={viewMode === 'map' ? 'hidden sm:block' : ''}>
        <FilterBar
          filters={filters}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterCounts={filterCounts}
          onUpdateFilter={updateFilter}
          onToggleTypeFilter={(value) => toggleArrayFilter("type", value)}
          onClearAll={clearAllFilters}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>

      {/* Decision shortcut chips — hidden to avoid duplication with filter bar */}
      {false && <DecisionChips filters={filters} onUpdateFilter={updateFilter} />}

      {/* Activity cards grid or curated sections */}
      {FEATURES.MAP_VIEW && viewMode === 'map' ? (
        <Suspense fallback={
          <div className="flex items-center justify-center" style={{ height: "calc(100vh - 56px - 52px)" }}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }>
          <div style={{ height: "calc(100vh - 56px - 52px)" }}>
            <MapView activities={filteredActivities} filters={filters} onViewModeChange={setViewMode} />
          </div>
        </Suspense>
      ) : hasActiveFilters ? (
        <ActivityGrid 
          activities={filteredActivities} 
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearAllFilters}
          filters={filters}
        />
      ) : (
        <>
          {/* Top rated recommendations when no filters active */}
          {FEATURES.TOP_RATED_HOMEPAGE && topRatedActivities.length > 0 && (
            <section className="bg-background py-6 md:py-10">
              <div className="container">
                <div className="mb-6 md:mb-8 text-center">
                  <h2 className="text-xl md:text-2xl font-serif text-foreground flex items-center justify-center gap-2">
                    <span>🔥</span> Najlepiej oceniane atrakcje w Polsce
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    Wybierz miasto aby zobaczyć atrakcje w Twojej okolicy
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {topRatedActivities.map((activity) => (
                    <ActivityCard
                      key={activity.id}
                      id={activity.id}
                      title={activity.title}
                      location={activity.location}
                      rating={activity.rating}
                      reviewCount={activity.reviewCount}
                      ageRange={activity.ageRange}
                      matchPercentage={activity.matchPercentage}
                      imageUrl={activity.imageUrl}
                      tags={activity.tags}
                      type={activity.type}
                      isEvent={activity.isEvent}
                      eventDate={activity.eventDate}
                      slug={activity.slug}
                      amenities={activity.amenities}
                      priceLevel={activity.priceLevel}
                      isRecommended={activity.isRecommended}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}
          <DiscoverSections 
            activities={filteredActivities}
            onSelectCity={(city) => {
              updateFilter("city", city);
              if (listingRef.current) {
                const headerHeight = 56;
                const elementPosition = listingRef.current.getBoundingClientRect().top + window.scrollY;
                window.scrollTo({ top: elementPosition - headerHeight, behavior: "smooth" });
              }
            }}
            onSelectCategory={(type) => {
              toggleArrayFilter("type", type);
              if (listingRef.current) {
                const headerHeight = 56;
                const elementPosition = listingRef.current.getBoundingClientRect().top + window.scrollY;
                window.scrollTo({ top: elementPosition - headerHeight, behavior: "smooth" });
              }
            }}
          />
        </>
      )}

      <Footer />
    </main>
      <AnimatePresence>
        {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}
      </AnimatePresence>
    </PageTransition>
  );
};

export default Index;
