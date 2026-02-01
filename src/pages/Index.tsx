import { useRef, useCallback } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FilterBar from "@/components/FilterBar";
import ActivityGrid from "@/components/ActivityGrid";
import PageTransition from "@/components/PageTransition";
import { useActivityFilters } from "@/hooks/useActivityFilters";
import { useGeolocationCity } from "@/hooks/useGeolocationCity";
import { useScrollPosition } from "@/hooks/useScrollPosition";

const Index = () => {
  const listingRef = useRef<HTMLDivElement>(null);
  const { detectCity } = useGeolocationCity();
  
  // Scroll position restoration
  useScrollPosition();
  
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
      <main className="min-h-screen bg-background">
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
      />

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
