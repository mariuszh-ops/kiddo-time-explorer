import { useRef, useCallback, useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import FilterBar from "@/components/FilterBar";
import ActivityGrid from "@/components/ActivityGrid";
import DiscoverSections from "@/components/DiscoverSections";
import PageTransition from "@/components/PageTransition";
import SubmitActivityCTA from "@/components/SubmitActivityCTA";
import SEOHead from "@/components/SEOHead";
import { useActivityFilters } from "@/hooks/useActivityFilters";
import { useGeolocationCity } from "@/hooks/useGeolocationCity";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { FEATURES } from "@/lib/featureFlags";

const Index = () => {
  const listingRef = useRef<HTMLDivElement>(null);
  const { detectCity } = useGeolocationCity();
  
  // Scroll position restoration - isScrollRestored ensures content only shows after scroll is set
  const { isScrollRestored } = useScrollPosition();
  
  // Initialize filters without initial city - city is set explicitly on explore
  const { filters, searchQuery, setSearchQuery, updateFilter, clearAllFilters, filteredActivities, filterCounts } = useActivityFilters();

  // Check if any filters are active - derived directly from filter state
  const hasActiveFilters = filterCounts.hasAnyFilter;

  const handleExplore = useCallback(async () => {
    if (FEATURES.MULTI_CITY) {
      // Detect city from geolocation
      const city = await detectCity();
      updateFilter("city", city);
    } else {
      // Single-city mode: just scroll to results, no geolocation needed
      updateFilter("city", "warszawa");
    }
    
    if (listingRef.current) {
      const headerHeight = 56;
      const elementPosition = listingRef.current.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: elementPosition - headerHeight, behavior: "smooth" });
    }
  }, [detectCity, updateFilter]);

  return (
    <PageTransition>
      <SEOHead
        title={FEATURES.MULTI_CITY
          ? "Atrakcje dla dzieci — sprawdzone przez rodziców"
          : "Atrakcje dla dzieci w Warszawie — sprawdzone przez rodziców"
        }
        description={FEATURES.MULTI_CITY
          ? "Odkryj najlepsze miejsca dla rodzin z dziećmi w Warszawie, Krakowie, Wrocławiu, Gdańsku i Poznaniu. Opinie i oceny od rodziców."
          : "Odkryj najlepsze miejsca dla rodzin z dziećmi w Warszawie. Opinie i oceny od rodziców. Place zabaw, muzea, parki i więcej."
        }
        path="/"
      />
      <main
        className="min-h-screen bg-background pb-20 sm:pb-0"
        style={{ 
          // Hide content until scroll is restored to prevent flash at top
          visibility: isScrollRestored ? 'visible' : 'hidden' 
        }}
      >
      {/* Global header with navigation */}
      <Header />

      {/* Hero section with full-width lifestyle image */}
      <HeroSection onExplore={handleExplore} />

      {/* Sticky filter bar - this is the scroll target */}
      <div ref={listingRef}>
        <FilterBar
          filters={filters}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterCounts={filterCounts}
          onUpdateFilter={updateFilter}
          onClearAll={clearAllFilters}
        />
      </div>

      {/* Activity cards grid or curated sections */}
      {hasActiveFilters ? (
        <ActivityGrid 
          activities={filteredActivities} 
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearAllFilters}
          filters={filters}
        />
      ) : (
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
        />
      )}

      {/* Submit activity CTA */}
      <div className="container py-8 md:py-12">
        <SubmitActivityCTA variant="card" />
      </div>

      <Footer />
    </main>
    </PageTransition>
  );
};

export default Index;
