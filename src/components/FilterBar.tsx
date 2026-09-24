import { useState } from "react";
import { cn } from "@/lib/utils";
import { activityCount, activityWord, verbPl } from "@/lib/plural";
import FilterDropdown from "@/components/FilterDropdown";
import MultiFilterDropdown from "@/components/MultiFilterDropdown";
import CityFilterDropdown from "@/components/CityFilterDropdown";
import MobileFilterSheet from "@/components/MobileFilterSheet";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import { Filters } from "@/hooks/useActivityFilters";
import type { FilterWriteOptions } from "@/hooks/useFilterSheetHistory";
import { X, Search, SlidersHorizontal, LayoutGrid, Map } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { FEATURES } from "@/lib/featureFlags";

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
  /** `opcje` podaje tylko arkusz filtrów na telefonie (FMN-B05). */
  onUpdateFilter: (key: keyof Filters, value: string | string[] | number | undefined, opcje?: FilterWriteOptions) => void;
  onToggleTypeFilter: (value: string, opcje?: FilterWriteOptions) => void;
  onClearAll: (opcje?: FilterWriteOptions) => void;
  viewMode?: "grid" | "map";
  onViewModeChange?: (mode: "grid" | "map") => void;
  /** Ukryj pole wyszukiwania w pasku filtrów (np. na home, gdzie szukanie żyje w hero). */
  hideSearch?: boolean;
  /**
   * Q-E-10b: sygnał „użytkownik sięga po filtr”. Strona główna włącza wtedy
   * serwerowe liczniki (rpc('ff_home_counts')), żeby liczby przy opcjach były
   * gotowe w chwili rozwinięcia listy. Wcześniej to samo miejsce wołało
   * ensureActivitiesLoaded(), czyli ściągało cały katalog.
   */
  onFilterIntent?: () => void;
}

// Dopełniacz nazwy stolicy województwa — używany w podpisach typu "…od centrum {miasto}".
// Źródło: src/data/regions.ts.
import { REGION_BY_SLUG } from "@/data/regions";
const getCapitalCityGenitive = (cityValue: string): string => {
  return REGION_BY_SLUG[cityValue]?.capitalCityGenitive ?? cityValue;
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
  hideSearch = false,
  onFilterIntent,
}: FilterBarProps) => {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const isMobile = useIsMobile();
  // Sygnał „sięgam po filtr”. Nie podpinamy go pod cały pasek — przewijanie
  // palcem po sticky barze ani przejście tabem nie mają nic pobierać.
  const prefetchCatalog = () => onFilterIntent?.();

  // Sort is not counted as an active filter
  const activeFilterCount = Object.entries(filters).filter(([k, v]) => k !== "sort" && (Array.isArray(v) ? v.length > 0 : Boolean(v))).length + (searchQuery.trim() ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  // Polish grammar for "atrakcja/atrakcje/atrakcji"
  const formatCount = (n: number): string => (n === 0 ? "Brak atrakcji" : activityCount(n));

  // Polish grammar helper — returns just the word, without the number
  const formatAttractionWord = activityWord;

  // Check if any non-city/distance/sort filter is active
  const hasExtraFilters = Boolean(
    filters.age || (filters.type && filters.type.length > 0) || filters.indoor || filters.price || filters.activityKind || searchQuery.trim()
  );

  // Generate dynamic feedback text
  const getFeedbackText = () => {
    const count = formatCount(filterCounts.filtered);
    if (filters.distance !== undefined && filters.distance > 0 && filters.city) {
      const cityName = getCapitalCityGenitive(filters.city);
      const suffix = hasExtraFilters ? " spełniających podane kryteria" : "";
      return `${count} w promieniu ${filters.distance} km od centrum ${cityName}${suffix}`;
    }
    // Przy zerze „Brak atrakcji spełnia wybrane filtry” było niegramatyczne (K-21).
    if (filterCounts.filtered === 0) return "Żadna atrakcja nie spełnia wybranych filtrów";
    return `${count} ${verbPl(filterCounts.filtered, "pasuje", "pasują")} do wybranych filtrów`;
  };

  // Mobile layout
  if (isMobile) {
    return (
      <>
        {/* W-E-01: pasek filtrow wylaczony z tlumaczenia — patrz CategoryFilterBar. */}
        <section className="bg-card sticky top-14 z-40 shadow-sm border-b border-border notranslate" translate="no">
          <div className="container py-3">
            {/* Mobile: always-visible search field (above Filters button) */}
            {FEATURES.SEARCH_AUTOCOMPLETE && !hideSearch && (
              <div className="mb-3 w-full [&_input]:!w-full">
                <span onPointerDown={prefetchCatalog} onFocus={prefetchCatalog} className="contents">
                  <SearchAutocomplete
                    searchQuery={searchQuery}
                    onSearchChange={onSearchChange}
                  />
                </span>
              </div>
            )}
            {/* Mobile: Filter button and results feedback */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span onPointerDown={prefetchCatalog} onFocus={prefetchCatalog} className="contents">
                  <button
                    onClick={() => setIsMobileFilterOpen(true)}
                    className="inline-flex min-h-11 min-w-11 items-center gap-2 px-4 py-2.5 rounded-full bg-secondary border border-border text-sm font-medium text-foreground active:bg-muted transition-colors"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Filtry</span>
                    {activeFilterCount > 0 && (
                      <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </button>
                </span>

                {/* Map/Grid toggle */}
                {FEATURES.MAP_VIEW && onViewModeChange && (
                  <button
                    data-no-prefetch
                    onClick={() => onViewModeChange(viewMode === "map" ? "grid" : "map")}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-secondary border border-border text-sm font-medium text-foreground transition-colors active:bg-muted"
                    )}
                    aria-label={viewMode === "map" ? "Lista — widok listy" : "Mapa — widok mapy"}
                  >
                    {viewMode === "map" ? <LayoutGrid className="w-4 h-4" /> : <Map className="w-4 h-4" />}
                    <span>{viewMode === "map" ? "Lista" : "Mapa"}</span>
                  </button>
                )}
              </div>

              {/* Results feedback — live region obecna od wejscia na strone (K-10),
                  inaczej czytnik nie oglasza pierwszej zmiany filtra. */}
              <span
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className={hasActiveFilters ? "text-sm text-muted-foreground" : "sr-only"}
              >
                {hasActiveFilters ? (
                  <>
                    <span className="font-medium text-foreground">{filterCounts.filtered}</span>{" "}
                    {formatAttractionWord(filterCounts.filtered)}
                  </>
                ) : null}
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
          onToggleTypeFilter={onToggleTypeFilter}
          onClearAll={onClearAll}
        />
      </>
    );
  }

  // Desktop layout
  return (
    <>
      {/* W-E-01: pasek filtrow wylaczony z tlumaczenia — patrz CategoryFilterBar. */}
      <section className="bg-card sticky top-14 md:top-16 z-40 shadow-sm border-b border-border notranslate" translate="no">
        <div className="container py-3">
          {/* Filter pills - horizontal scroll on mobile */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
            {/* Combined City + Distance filter — shown only when multiple cities enabled */}
            {FEATURES.ENABLED_CITIES.length > 1 && (
              <span onPointerDown={prefetchCatalog} onFocus={prefetchCatalog} className="contents">
                <CityFilterDropdown
                  cityOptions={filterCounts.city.filter(c => FEATURES.ENABLED_CITIES.includes(c.value))}
                  selectedCity={filters.city}
                  selectedDistance={filters.distance}
                  hasAnyFilter={filterCounts.hasAnyFilter}
                  filteredCount={filterCounts.filtered}
                  onCitySelect={(value) => onUpdateFilter("city", value)}
                  onDistanceChange={(value) => onUpdateFilter("distance", value)}
                />
              </span>
            )}

            <span onPointerDown={prefetchCatalog} onFocus={prefetchCatalog} className="contents">
              <FilterDropdown
                label="Wiek dziecka"
                options={filterCounts.age}
                selectedValue={filters.age}
                hasAnyFilter={filterCounts.hasAnyFilter}
                onSelect={(value) => onUpdateFilter("age", value)}
              />
            </span>

            <span onPointerDown={prefetchCatalog} onFocus={prefetchCatalog} className="contents">
              <MultiFilterDropdown
                label="Kategoria"
                options={filterCounts.type}
                selectedValues={filters.type || []}
                hasAnyFilter={filterCounts.hasAnyFilter}
                onToggle={onToggleTypeFilter}
                onClear={() => onUpdateFilter("type", undefined)}
              />
            </span>

            {/* Filtr „Pod dachem?" ukryty — isIndoor twardo false w danych (0 wyników). Logika w useActivityFilters zostaje.
            <FilterDropdown
              label="Pod dachem?"
              options={filterCounts.indoor}
              selectedValue={filters.indoor}
              hasAnyFilter={filterCounts.hasAnyFilter}
              onSelect={(value) => onUpdateFilter("indoor", value)}
            />
            */}

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
            {hideSearch ? null : FEATURES.SEARCH_AUTOCOMPLETE ? (
              <span onPointerDown={prefetchCatalog} onFocus={prefetchCatalog} className="contents">
                <SearchAutocomplete
                  searchQuery={searchQuery}
                  onSearchChange={onSearchChange}
                />
              </span>
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
                    className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-secondary border border-border hover:bg-muted transition-colors"
                    aria-label="Szukaj"
                  >
                    <Search className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            )}

            {/* Map/Grid toggle - desktop */}
            {FEATURES.MAP_VIEW && onViewModeChange && (
              <div className="relative group ml-auto">
                <button
                  data-no-prefetch
                    onClick={() => onViewModeChange(viewMode === "map" ? "grid" : "map")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-secondary border border-border text-sm font-medium transition-colors whitespace-nowrap text-foreground hover:bg-muted"
                  )}
                  aria-label={viewMode === "map" ? "Lista — widok listy" : "Mapa — widok mapy"}
                >
                  {viewMode === "map" ? <LayoutGrid className="w-4 h-4" /> : <Map className="w-4 h-4" />}
                  {viewMode === "map" ? "Lista" : "Mapa"}
                </button>
              </div>
            )}
            {hasActiveFilters && (
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <label htmlFor="sort-select" className="text-xs text-muted-foreground">
                  Sortuj:
                </label>
                <select
                  id="sort-select"
                  value={filters.sort || "rating"}
                  onChange={(e) => onUpdateFilter("sort", e.target.value)}
                  className="text-sm bg-transparent border-none text-foreground font-medium cursor-pointer focus:outline-none"
                >
                  <option value="rating">Najlepiej oceniane</option>
                  <option value="most_reviewed">Najwięcej ocen</option>
                  <option value="google_rating">Najlepiej oceniane (Google)</option>
                  <option value="google_popular">Najpopularniejsze (Google)</option>
                  <option value="distance-from-center">Najbliżej centrum</option>
                  <option value="name">Nazwa A–Z</option>
                </select>
              </div>
            )}

            {/* Clear all button - only when filters active */}
            {hasActiveFilters && (
              <button
                onClick={() => onClearAll()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors whitespace-nowrap shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                Wyczyść filtry
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Results feedback - outside sticky, scrolls normally.
          Live region jest w DOM od wejscia (K-10) — pusta, gdy nie ma filtrow. */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={hasActiveFilters ? "container py-2 text-sm text-muted-foreground" : "sr-only"}
      >
        {hasActiveFilters ? (
          <span className="font-medium text-foreground">{getFeedbackText()}</span>
        ) : null}
      </div>
    </>
  );
};

export default FilterBar;
