import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FilterBar from "@/components/FilterBar";
import ActivityGrid from "@/components/ActivityGrid";
import { useActivityFilters } from "@/hooks/useActivityFilters";

const Index = () => {
  const { filters, searchQuery, setSearchQuery, updateFilter, clearAllFilters, filteredActivities, filterCounts } = useActivityFilters();

  // Check if any filters are active
  const hasActiveFilters = Object.values(filters).some(arr => arr.length > 0) || searchQuery.length > 0;

  return (
    <main className="min-h-screen bg-background">
      {/* Global header with navigation */}
      <Header />

      {/* Hero section with full-width lifestyle image */}
      <HeroSection />

      {/* Sticky filter bar */}
      <FilterBar
        filters={filters}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterCounts={filterCounts}
        onUpdateFilter={updateFilter}
        onClearAll={clearAllFilters}
      />

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
              © 2026 kidsmoment. Wszystkie prawa zastrzeżone.
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
  );
};

export default Index;
