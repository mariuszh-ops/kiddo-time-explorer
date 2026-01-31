import FilterDropdown from "@/components/FilterDropdown";
import { Filters } from "@/hooks/useActivityFilters";
import { X } from "lucide-react";

interface FilterBarProps {
  filters: Filters;
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
  filterCounts,
  onUpdateFilter,
  onClearAll,
}: FilterBarProps) => {
  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <section className="bg-card/95 backdrop-blur-md border-b border-border sticky top-0 z-30">
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
