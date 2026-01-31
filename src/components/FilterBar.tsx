import { useState } from "react";
import FilterDropdown from "@/components/FilterDropdown";
import MobileFilterSheet from "@/components/MobileFilterSheet";
import { Filters } from "@/hooks/useActivityFilters";
import { X, Search, SlidersHorizontal } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";

interface FilterBarProps {
  filters: Filters;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterCounts: {
    city: { value: string; label: string; count: number }[];
    age: { value: string; label: string; count: number }[];
    type: { value: string; label: string; count: number }[];
    indoor: { value: string; label: string; count: number }[];
    total: number;
    filtered: number;
  };
  onUpdateFilter: (key: keyof Filters, value: string | undefined) => void;
  onClearAll: () => void;
}

const FilterBar = ({
  filters,
  searchQuery,
  onSearchChange,
  filterCounts,
  onUpdateFilter,
  onClearAll,
}: FilterBarProps) => {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const isMobile = useIsMobile();
  
  const activeFilterCount = Object.values(filters).filter(Boolean).length + (searchQuery.trim() ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  // Mobile layout
  if (isMobile) {
    return (
      <>
        <section className="bg-card/95 backdrop-blur-md border-b border-border sticky top-0 z-40">
          <div className="container py-3">
            {/* Mobile: Single filter button */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-secondary border border-border text-sm font-medium text-foreground active:bg-muted transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filtry</span>
                {activeFilterCount > 0 && (
                  <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </button>

              {/* Results count */}
              <span className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{filterCounts.filtered}</span> wyników
              </span>
            </div>
          </div>
        </section>

        {/* Mobile filter sheet */}
        <MobileFilterSheet
          isOpen={isMobileFilterOpen}
          onClose={() => setIsMobileFilterOpen(false)}
          filters={filters}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          filterCounts={filterCounts}
          onUpdateFilter={onUpdateFilter}
          onClearAll={onClearAll}
        />
      </>
    );
  }

  // Desktop layout (unchanged)
  return (
    <section className="bg-card/95 backdrop-blur-md border-b border-border sticky top-0 z-40">
      <div className="container py-3">
        {/* Filter pills - horizontal scroll on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
          <FilterDropdown
            label="Miasto"
            options={filterCounts.city}
            selectedValue={filters.city}
            totalCount={filterCounts.total}
            onSelect={(value) => onUpdateFilter("city", value)}
          />
          
          <FilterDropdown
            label="Wiek dziecka"
            options={filterCounts.age}
            selectedValue={filters.age}
            totalCount={filterCounts.total}
            onSelect={(value) => onUpdateFilter("age", value)}
          />
          
          <FilterDropdown
            label="Typ aktywności"
            options={filterCounts.type}
            selectedValue={filters.type}
            totalCount={filterCounts.total}
            onSelect={(value) => onUpdateFilter("type", value)}
          />
          
          <FilterDropdown
            label="Lokalizacja"
            options={filterCounts.indoor}
            selectedValue={filters.indoor}
            totalCount={filterCounts.total}
            onSelect={(value) => onUpdateFilter("indoor", value)}
          />

          {/* Search input */}
          <div className="relative flex items-center">
            {isSearchExpanded ? (
              <div className="flex items-center gap-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Szukaj..."
                    autoFocus
                    className="pl-8 pr-3 py-2 w-40 md:w-48 rounded-full text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    onBlur={() => {
                      if (!searchQuery.trim()) {
                        setIsSearchExpanded(false);
                      }
                    }}
                  />
                </div>
                {searchQuery && (
                  <button
                    onClick={() => {
                      onSearchChange("");
                      setIsSearchExpanded(false);
                    }}
                    className="p-1.5 rounded-full hover:bg-muted transition-colors"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsSearchExpanded(true)}
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-secondary border border-border hover:bg-muted transition-colors"
                aria-label="Szukaj"
              >
                <Search className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Clear all button */}
          {hasActiveFilters && (
            <button
              onClick={onClearAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5" />
              Wyczyść
            </button>
          )}
        </div>

        {/* Results count - subtle indicator */}
        <div className="mt-2 text-sm text-muted-foreground">
          {hasActiveFilters ? (
            <span>
              Znaleziono <span className="font-medium text-foreground">{filterCounts.filtered}</span> aktywności
            </span>
          ) : (
            <span>
              <span className="font-medium text-foreground">{filterCounts.total}</span> aktywności w Twojej okolicy
            </span>
          )}
        </div>
      </div>
    </section>
  );
};

export default FilterBar;
