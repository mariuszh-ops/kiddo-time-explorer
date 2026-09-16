import { trackEvent } from "@/lib/analytics";
import { lazy, Suspense, useRef, useCallback, useState, useEffect, useMemo } from "react";
import MapViewSkeleton from "@/components/MapViewSkeleton";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Activity } from "@/data/activities";
import type { SavedMapState } from "@/components/MapView";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import FilterBar from "@/components/FilterBar";
import ErrorBoundary from "@/components/ErrorBoundary";
import ActivityGrid from "@/components/ActivityGrid";
import ActivityCard from "@/components/ActivityCard";
import AllActivitiesListing from "@/components/AllActivitiesListing";
import DiscoverSections from "@/components/DiscoverSections";
import PageTransition from "@/components/PageTransition";
import SEOHead from "@/components/SEOHead";
import { useActivityFilters } from "@/hooks/useActivityFilters";
import { useHomeCatalog, HOME_PAGE_SIZE } from "@/hooks/useHomeCatalog";
import { Button } from "@/components/ui/button";
import { useGeolocationCity } from "@/hooks/useGeolocationCity";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { useMapUrlState } from "@/hooks/useMapUrlState";
import { useDataStatus } from "@/hooks/useDataStatus";
import { FEATURES } from "@/lib/featureFlags";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import OnboardingModal from "@/components/OnboardingModal";
const MapView = lazy(() => import("@/components/MapView"));
import { getRawItem, setRawItem, STORAGE_KEYS } from "@/lib/storage";
import HomeSearch from "@/components/HomeSearch";
import { useTopActivities } from "@/hooks/useTopActivities";
import { ensureActivitiesLoaded } from "@/data/activities";
import { useRealNavigationType } from "@/lib/navigationType";

const Index = () => {
  const listingRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { detectCity } = useGeolocationCity();
  
  // Scroll position restoration - isScrollRestored ensures content only shows after scroll is set
  const { isScrollRestored } = useScrollPosition();
  
  // Initialize filters without initial city - city is set explicitly on explore
  const { filters, searchQuery, setSearchQuery, updateFilter, toggleArrayFilter, clearAllFilters, filteredActivities, filterCounts } = useActivityFilters();

  // View mode: grid or map (sync with URL param from bottom nav)
  const [searchParams, setSearchParams] = useSearchParams();

  // Sync ?search= from URL into filter state (supports SearchAction JSON-LD
  // target and SPA navigations from HomeSearch Enter).
  useEffect(() => {
    const q = searchParams.get("search") ?? "";
    if (q !== searchQuery) setSearchQuery(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Fraza wpisana w polu (FilterBar/HomeSearch) trafia do ?search=, żeby po
  // „wstecz" z karty atrakcji wróciła zarówno do pola, jak i do wyników.
  useEffect(() => {
    const q = searchQuery.trim();
    if ((searchParams.get("search") ?? "") === q) return;
    const t = setTimeout(() => {
      setSearchParams((prev) => {
        if (q) prev.set("search", q);
        else prev.delete("search");
        return prev;
      }, { replace: true });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);
  const { viewMode, setViewMode, savedMapState, handleSaveMapState } = useMapUrlState(
    searchParams,
    setSearchParams,
  );
  // Activities from map viewport — used when switching from map to grid
  const [mapVisibleActivities, setMapVisibleActivities] = useState<Activity[] | null>(null);

  const handleViewModeChange = useCallback((mode: "grid" | "map", visibleActivities?: Activity[]) => {
    if (mode === "grid" && visibleActivities) {
      setMapVisibleActivities(visibleActivities);
    } else {
      setMapVisibleActivities(null);
    }
    if (mode === "map") trackEvent("map_open", { source: "home" });
    setViewMode(mode);
  }, [setViewMode]);

  // No longer reset to grid when city is cleared — map works without city filter

  // Check if any filters are active - derived directly from filter state
  const hasActiveFilters = filterCounts.hasAnyFilter;

  // Pełny listing całej Polski (link "Zobacz wszystkie atrakcje").
  const showAll = searchParams.get("all") === "1";
  // Q-E-10: ?all=1 BEZ filtrów idzie serwerową paginacją (AllActivitiesListing,
  // porcje po 24), a nie pełnym zrzutem katalogu do pamięci. Katalog w całości
  // dociągamy dopiero wtedy, gdy użytkownik użyje filtra — wtedy liczy go
  // useActivityFilters po stronie klienta i to on woła ensureActivitiesLoaded().
  const listingSerwerowy = showAll && !hasActiveFilters;
  const dataStatus = useDataStatus();
  // Q-E-10b: pełny katalog w pamięci dociąga już TYLKO widok mapy z filtrami
  // (mapa musi mieć wszystkie pasujące piny, nie jedną stronę). Siatka i liczniki
  // idą serwerowo, więc tu wystarczy stan tamtego jednego pobrania.
  const katalogSieLaduje = dataStatus === "loading";

  // Q-E-10b: liczniki przy opcjach filtrów liczy serwer. Włączamy je, gdy filtr
  // jest aktywny albo gdy użytkownik dopiero sięga po kontrolkę filtrującą —
  // samo wejście na stronę główną nie ma odpalać żadnego zapytania.
  const [dotknietoFiltrow, setDotknietoFiltrow] = useState(false);
  const zapytaniaSerwerowe = viewMode !== "map" && (hasActiveFilters || dotknietoFiltrow);
  const home = useHomeCatalog(filters, searchQuery, zapytaniaSerwerowe);

  // F-1: "Zobacz wszystkie atrakcje" prowadzi na /?all=1, czyli TEN SAM pathname.
  // useScrollPosition przewija tylko przy zmianie location.pathname, wiec po
  // kliknieciu uzytkownik zostawal na wysokosci przycisku (zmierzone: 1537 px na
  // desktopie, 4045 px na mobile) i ladowal w polowie siatki, ktora dodatkowo
  // skakala w trakcie doladowywania katalogu. Nowa lista = gora strony.
  const realNavigationType = useRealNavigationType();
  const poprzednioShowAll = useRef(showAll);
  useEffect(() => {
    const wlasnieWlaczony = showAll && !poprzednioShowAll.current;
    poprzednioShowAll.current = showAll;
    // Tylko PUSH: powrot "wstecz" z karty atrakcji ma zachowac pozycje.
    if (wlasnieWlaczony && realNavigationType === "PUSH") window.scrollTo(0, 0);
  }, [showAll, realNavigationType]);

  // Scroll listing into view when filters change (not on mount, not on back-navigation)
  const filtersKey = JSON.stringify({ ...filters, search: searchQuery });
  const prevFiltersKey = useRef<string | null>(null);
  useEffect(() => {
    if (prevFiltersKey.current === null) {
      // First render — do not scroll, let useScrollPosition handle it
      prevFiltersKey.current = filtersKey;
      return;
    }
    if (prevFiltersKey.current !== filtersKey) {
      prevFiltersKey.current = filtersKey;
      // Only scroll if user is already past the listing (avoid scrolling when near top)
      if (listingRef.current) {
        const headerHeight = 56;
        const rect = listingRef.current.getBoundingClientRect();
        // If listing is already above viewport, or user scrolled past it
        if (rect.top < headerHeight) {
          const elementPosition = rect.top + window.scrollY;
          window.scrollTo({
            top: elementPosition - headerHeight,
            behavior: "smooth",
          });
        }
      }
    }
  }, [filtersKey]);

  // Polecane na home — jedno zapytanie z limitem (bez pełnego katalogu).
  const { activities: topActivities } = useTopActivities(8);
  const topRatedActivities = useMemo(
    () => (!FEATURES.TOP_RATED_HOMEPAGE || hasActiveFilters ? [] : topActivities),
    [topActivities, hasActiveFilters],
  );

  // Widok mapy bez filtrów bierze piny z rpc('get_map_pins') (jedno zapytanie,
  // patrz MapView) — pełny katalog dociągamy tylko wtedy, gdy filtry
  // (województwo, wiek, dystans…) faktycznie go potrzebują.
  useEffect(() => {
    if (viewMode === "map" && hasActiveFilters) ensureActivitiesLoaded();
  }, [viewMode, hasActiveFilters]);

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    if (FEATURES.ONBOARDING && !getRawItem(STORAGE_KEYS.ONBOARDING_SEEN)) {
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
    setRawItem(STORAGE_KEYS.ONBOARDING_SEEN, 'true');
    setShowOnboarding(false);
    if (selectedCity) {
      setRawItem(STORAGE_KEYS.USER_CITY, selectedCity);
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

  // Reset all filters but keep the selected city
  const clearFiltersKeepCity = useCallback(() => {
    setSearchQuery("");
    updateFilter("age", undefined);
    updateFilter("type", []);
    updateFilter("indoor", undefined);
    updateFilter("distance", undefined);
  }, [setSearchQuery, updateFilter]);

  return (
    <PageTransition>
      <SEOHead
        title="Atrakcje dla dzieci — sprawdzone przez rodziców"
        description="Odkryj najlepsze atrakcje dla rodzin z dziećmi w 16 województwach Polski. Opinie i oceny od rodziców."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "FamilyFun",
          "url": "https://familyfun.pl",
          "description": "Sprawdzone atrakcje dla rodzin z dziećmi w 16 województwach Polski",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://familyfun.pl/?search={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        }}
      />
      {/* Global header with navigation — landmark banner MUSI byc poza <main> (K-02) */}
      <Header />
      <main
        id="main-content"
        className={cn(
          "bg-background pb-20 md:pb-0 transition-opacity duration-150",
          isMobile && viewMode === 'map'
            // Header jest teraz rodzenstwem main, wiec wysokosc liczymy bez niego,
            // inaczej strona w trybie mapy urosla by o pasek naglowka.
            ? "h-[calc(100vh-var(--header-h,72px))] overflow-hidden pb-0"
            : "min-h-[calc(100vh-var(--header-h,72px))]"
        )}
        style={{ 
          opacity: isScrollRestored ? 1 : 0
        }}
      >

      {/* Hero section — hidden in map view */}
      <div
        className={cn(
          "transition-all duration-300 overflow-hidden",
          viewMode === "map" ? "max-h-0 opacity-0" : "max-h-[1000px] opacity-100"
        )}
      >
        <HeroSection onExplore={handleExplore} />
      </div>

      {/* Map view — rendered outside the hidden wrapper so it's visible on mobile */}
      {FEATURES.MAP_VIEW && viewMode === 'map' && (
        <ErrorBoundary fallbackLevel="section">
        <Suspense fallback={<MapViewSkeleton />}>
          <MapView
            activities={filteredActivities}
            filters={filters}
            onViewModeChange={handleViewModeChange}
            savedMapState={savedMapState}
            onSaveMapState={handleSaveMapState}
          />
        </Suspense>
        </ErrorBoundary>
      )}

      {/* Sticky filter bar + content wrapper — hidden on mobile map view */}
      <div ref={listingRef} className={viewMode === 'map' ? 'hidden sm:block' : ''}>
        {/* W-E-01: pasek filtrow ma wlasna granice bledu — crash w jednym
            dropdownie nie moze zdejmowac calej strony glownej. */}
        <ErrorBoundary fallbackLevel="section">
        <FilterBar
          filters={filters}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterCounts={home.filterCounts}
          onFilterIntent={() => setDotknietoFiltrow(true)}
          onUpdateFilter={(key, value) => {
            // Pasek filtrów na home: zdarzenia analityki dla trzech pól, po których
            // widać, czego ludzie szukają (A-12).
            if (key === "city" && value) trackEvent("filter_city", { city: String(value), source: "filterbar" });
            if (key === "age" && value) trackEvent("filter_age", { age: String(value), source: "filterbar" });
            updateFilter(key, value);
          }}
          onToggleTypeFilter={(value) => {
            trackEvent("filter_type", { type: value, source: "filterbar" });
            toggleArrayFilter("type", value);
          }}
          onClearAll={clearAllFilters}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          hideSearch={!mapVisibleActivities && !hasActiveFilters && !showAll}
        />
        </ErrorBoundary>

      {/* Activity cards grid or curated sections — osobna granica bledu (W-E-01). */}
      <ErrorBoundary fallbackLevel="section">
      {mapVisibleActivities ? (
        <ActivityGrid 
          activities={mapVisibleActivities} 
          hasActiveFilters={true}
          onClearFilters={() => { setMapVisibleActivities(null); clearAllFilters(); }}
          searchQuery={searchQuery}
          onClearSearch={() => setSearchQuery("")}
          filters={filters}
          mapReturnAction={() => handleViewModeChange("map")}
          isLoading={katalogSieLaduje}
        />
      ) : listingSerwerowy ? (
        <AllActivitiesListing />
      ) : hasActiveFilters ? (
        <>
          {/* Q-E-10b: wyniki filtrów idą serwerową paginacją (porcje po
              HOME_PAGE_SIZE), nie filtrowaniem całego katalogu w pamięci. */}
          <ActivityGrid
            activities={home.activities}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearAllFilters}
            onClearFiltersKeepCity={clearFiltersKeepCity}
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery("")}
            filters={filters}
            isLoading={home.loading}
            hasError={Boolean(home.error) && home.activities.length === 0}
            onRetry={home.refetch}
            paginate={false}
          />
          {home.hasMore && !home.error && (
            <div className="container mt-8 flex justify-center">
              <Button onClick={home.loadMore} disabled={home.loadingMore} variant="outline" size="lg">
                {home.loadingMore
                  ? "Wczytywanie…"
                  : `Pokaż więcej (${Math.max(0, home.filterCounts.filtered - home.activities.length)})`}
              </Button>
            </div>
          )}
          {/* Doładowanie kolejnej porcji padło — to, co już jest, zostaje na ekranie. */}
          {home.error && home.activities.length > 0 && (
            <div className="container mt-8 flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground">Nie udało się wczytać kolejnych atrakcji.</p>
              <Button onClick={home.refetch} variant="outline" size="lg">
                Spróbuj ponownie
              </Button>
            </div>
          )}
          {!home.hasMore && !home.loading && !home.error && home.filterCounts.filtered > HOME_PAGE_SIZE && (
            <p className="text-center text-muted-foreground mt-10 text-sm">
              To wszystkie atrakcje pasujące do filtrów
            </p>
          )}
        </>
      ) : (
        <>
          {/* Prominent search field above city tiles */}
          <HomeSearch />
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
                      google_rating={activity.google_rating}
                      google_review_count={activity.google_review_count}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}
          <DiscoverSections 
            onSelectCity={(city) => {
              trackEvent("filter_city", { city, source: "discover" });
              updateFilter("city", city);
              if (listingRef.current) {
                const headerHeight = 56;
                const elementPosition = listingRef.current.getBoundingClientRect().top + window.scrollY;
                window.scrollTo({ top: elementPosition - headerHeight, behavior: "smooth" });
              }
            }}
            onSelectCategory={(type) => {
              trackEvent("filter_type", { type, source: "discover" });
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
      </ErrorBoundary>
      </div>

    </main>
      {/* Hide footer on mobile map view — landmark contentinfo poza <main> (K-02) */}
      {!(isMobile && viewMode === 'map') && <Footer />}
      <AnimatePresence>
        {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}
      </AnimatePresence>
    </PageTransition>
  );
};

export default Index;
