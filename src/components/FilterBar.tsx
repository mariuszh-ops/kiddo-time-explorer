import { useState } from "react";
import FilterDropdown from "@/components/FilterDropdown";
import MultiFilterDropdown from "@/components/MultiFilterDropdown";
import CityFilterDropdown from "@/components/CityFilterDropdown";
import MobileFilterSheet from "@/components/MobileFilterSheet";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import { Filters } from "@/hooks/useActivityFilters";
import { X, Search, SlidersHorizontal, LayoutGrid, Map } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { FEATURES } from "@/lib/featureFlags";
import { getActivities } from "@/data/activities";

interface FilterBarProps {
  filters: Filters;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterCounts: {
    city: { value: string; label: string; count: number }[];
    age: { value: string; label: string; count: number }[];
    type: { value: string; label: string; count: number }[];
    indoor: { value: string; label: string; count: number }[];
    activityKind: { value: string; label: string; count: number }[];
    distance: { value: string; label: string; count: number }[];
    price: { value: string; label: string; count: number }[];
    total: number;
    filtered: number;
    hasAnyFilter: boolean;
  };
  onUpdateFilter: (key: keyof Filters, value: string | string[] | number | undefined) => void;
  onToggleTypeFilter: (value: string) => void;
  onClearAll: () => void;
  viewMode?: "grid" | "map";
  onViewModeChange?: (mode: "grid" | "map") => void;
}

// Helper to get city name in genitive case (Polish grammar)
const getCityNameGenitive = (cityValue: string): string => {
  const cityNames: Record<string, string> = {
    warszawa: "Warszawy",
    krakow: "Krakowa",
    wroclaw: "Wrocławia",
    trojmiasto: "Trójmiasta",
    poznan: "Poznania",
    slask: "Śląska",
    lodz: "Łodzi",
  };
  return cityNames[cityValue] || cityValue;
};

const FilterBar = ({
  filters,
  searchQuery,
  onSearchChange,
  filterCounts,
  onUpdateFilter,
  onToggleTypeFilter,
  onClearAll,
  viewMode,
  onViewModeChange,
}: FilterBarProps) => {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const isMobile = useIsMobile();
  
  // Sort is not counted as an active filter
  const activeFilterCount = Object.entries(filters).filter(([k, v]) => k !== "sort" && (Array.isArray(v) ? v.length > 0 : Boolean(v))).length + (searchQuery.trim() ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  // Generate dynamic feedback text
  const getFeedbackText = () => {
    if (filters.distance !== undefined && filters.city) {
      const cityName = getCityNameGenitive(filters.city);
      return `${filterCounts.filtered} atrakcji w promieniu ${filters.distance} km od ${cityName}`;
    }
    return `${filterCounts.filtered} atrakcji spełnia wybrane filtry`;
  };

  // Mobile layout
  if (isMobile) {
    return (
      <>
        <section className="bg-card/95 backdrop-blur-md border-b border-border sticky top-0 z-40">
          <div className="container py-3">
            {/* Mobile: Filter button and results feedback */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
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

                {/* Map/Grid toggle */}
                {FEATURES.MAP_VIEW && onViewModeChange && (
                  <button
                    onClick={() => onViewModeChange(viewMode === "map" ? "grid" : "map")}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-secondary border border-border active:bg-muted transition-colors"
                    aria-label={viewMode === "map" ? "Widok listy" : "Widok mapy"}
                  >
                    {viewMode === "map" ? <LayoutGrid className="w-4 h-4" /> : <Map className="w-4 h-4" />}
                  </button>
                )}
              </div>

              {/* Results feedback - only when filters active */}
              {hasActiveFilters && (
                <span className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{filterCounts.filtered}</span> atrakcji
                </span>
              )}
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
          {/* Combined City + Distance filter — shown only when multiple cities enabled */}
          {FEATURES.ENABLED_CITIES.length > 1 && (
            <CityFilterDropdown
              cityOptions={filterCounts.city.filter(c => FEATURES.ENABLED_CITIES.includes(c.value))}
              selectedCity={filters.city}
              selectedDistance={filters.distance}
              hasAnyFilter={filterCounts.hasAnyFilter}
              filteredCount={filterCounts.filtered}
              onCitySelect={(value) => onUpdateFilter("city", value)}
              onDistanceChange={(value) => onUpdateFilter("distance", value)}
            />
          )}
          
          <FilterDropdown
            label="Wiek dziecka"
            options={filterCounts.age}
            selectedValue={filters.age}
            hasAnyFilter={filterCounts.hasAnyFilter}
            onSelect={(value) => onUpdateFilter("age", value)}
          />
          
          <FilterDropdown
            label="Kategoria"
            options={filterCounts.type}
            selectedValue={filters.type}
            hasAnyFilter={filterCounts.hasAnyFilter}
            onSelect={(value) => onUpdateFilter("type", value)}
          />
          
          <FilterDropdown
            label="Pod dachem?"
            options={filterCounts.indoor}
            selectedValue={filters.indoor}
            hasAnyFilter={filterCounts.hasAnyFilter}
            onSelect={(value) => onUpdateFilter("indoor", value)}
          />
          
          {/* Price filter - hidden until better data */}
          {/* 
          <FilterDropdown
            label="Cena"
            options={filterCounts.price}
            selectedValue={filters.price}
            hasAnyFilter={filterCounts.hasAnyFilter}
            onSelect={(value) => onUpdateFilter("price", value)}
          />
          */}
          
          {/* Typ atrakcji filter - hidden in MVP, structure preserved */}
          {/* 
          <FilterDropdown
            label="Typ atrakcji"
            options={filterCounts.activityKind}
            selectedValue={filters.activityKind}
            hasAnyFilter={filterCounts.hasAnyFilter}
            onSelect={(value) => onUpdateFilter("activityKind", value)}
          />
          */}

          {/* Search input */}
          {FEATURES.SEARCH_AUTOCOMPLETE ? (
            <SearchAutocomplete
              activities={getActivities()}
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
            />
          ) : (
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
          )}

          {/* Map/Grid toggle - desktop */}
          {FEATURES.MAP_VIEW && onViewModeChange && (
            <button
              onClick={() => onViewModeChange(viewMode === "map" ? "grid" : "map")}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-secondary border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors whitespace-nowrap ml-auto"
              aria-label={viewMode === "map" ? "Widok listy" : "Widok mapy"}
            >
              {viewMode === "map" ? <LayoutGrid className="w-4 h-4" /> : <Map className="w-4 h-4" />}
              {viewMode === "map" ? "Lista" : "Mapa"}
            </button>
          )}
          {hasActiveFilters && (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-xs text-muted-foreground">Sortuj:</span>
              <select
                value={filters.sort || "rating"}
                onChange={(e) => onUpdateFilter("sort", e.target.value)}
                className="text-sm bg-transparent border-none text-foreground font-medium cursor-pointer focus:outline-none"
              >
                <option value="rating">Najlepiej oceniane</option>
                <option value="most_reviewed">Najwięcej ocen</option>
                <option value="name">Nazwa A–Z</option>
              </select>
            </div>
          )}

          {/* Clear all button - only when filters active */}
          {hasActiveFilters && (
            <button
              onClick={onClearAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5" />
              Wyczyść filtry
            </button>
          )}
        </div>

        {/* Results feedback - only when filters active */}
        {hasActiveFilters && (
          <div className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{getFeedbackText()}</span>
          </div>
        )}
      </div>
    </section>
  );
};

export default FilterBar;
