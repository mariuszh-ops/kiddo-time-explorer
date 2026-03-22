import { useRef, useCallback } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import FilterBar from "@/components/FilterBar";
import ActivityGrid from "@/components/ActivityGrid";
import PageTransition from "@/components/PageTransition";
import SubmitActivityCTA from "@/components/SubmitActivityCTA";
import { useActivityFilters } from "@/hooks/useActivityFilters";
import { useGeolocationCity } from "@/hooks/useGeolocationCity";
import { useScrollPosition } from "@/hooks/useScrollPosition";

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
    // Detect city from geolocation (or use default)
    const city = await detectCity();
    
    // Update the city filter directly - no separate state needed
    updateFilter("city", city);
    
    // Scroll to the listing
    if (listingRef.current) {
      const headerHeight = 56; // Account for sticky header
      const elementPosition = listingRef.current.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementPosition - headerHeight,
        behavior: "smooth",
      });
    }
  }, [detectCity, updateFilter]);

  return (
    <PageTransition>
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

      {/* Activity cards grid */}
      <ActivityGrid 
        activities={filteredActivities} 
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearAllFilters}
        filters={filters}
      />

      {/* Submit activity CTA */}
      <div className="container py-8 md:py-12">
        <SubmitActivityCTA variant="card" />
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 FamilyFun. Wszystkie prawa zastrzeżone.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                Regulamin
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Polityka prywatności
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Kontakt
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
    </PageTransition>
  );
};

export default Index;
