import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { X, Search, MapPin } from "lucide-react";
import { Filters } from "@/hooks/useActivityFilters";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FEATURES } from "@/lib/featureFlags";
import { cn } from "@/lib/utils";

interface FilterOption {
  value: string;
  label: string;
  count: number;
}

interface MobileFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: Filters;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterCounts: {
    city: FilterOption[];
    age: FilterOption[];
    type: FilterOption[];
    indoor: FilterOption[];
    activityKind: FilterOption[];
    distance: FilterOption[];
    price: FilterOption[];
    total: number;
    filtered: number;
    hasAnyFilter: boolean;
  };
  onUpdateFilter: (key: keyof Filters, value: string | number | undefined) => void;
  onClearAll: () => void;
}

// DisabledFilterSection removed - distance is now integrated with city filter

const FilterSection = ({
  title,
  options,
  selectedValue,
  onSelect,
}: {
  title: string;
  options: FilterOption[];
  selectedValue?: string;
  onSelect: (value: string | undefined) => void;
}) => {
  return (
    <div className="py-4 border-b border-border last:border-b-0">
      <h3 className="text-base font-semibold text-foreground mb-3">{title}</h3>
      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(selectedValue === option.value ? undefined : option.value)}
            className="flex items-center justify-between w-full py-2.5 px-3 rounded-lg hover:bg-muted/50 active:bg-muted transition-colors"
          >
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedValue === option.value}
                className="pointer-events-none"
              />
              <span className="text-sm text-foreground">{option.label}</span>
            </div>
            <span className="text-xs text-muted-foreground">({option.count})</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const MobileFilterSheet = ({
  isOpen,
  onClose,
  filters,
  searchQuery,
  onSearchChange,
  filterCounts,
  onUpdateFilter,
  onClearAll,
}: MobileFilterSheetProps) => {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [localDistance, setLocalDistance] = useState(filters.distance ?? 5);
  const hasActiveFilters = Object.values(filters).some(Boolean) || searchQuery.trim().length > 0;
  const hasCitySelected = Boolean(filters.city);

  // Sync local distance when filters change
  useEffect(() => {
    if (filters.distance !== undefined) {
      setLocalDistance(filters.distance);
    }
  }, [filters.distance]);

  const handleApply = () => {
    onSearchChange(localSearch);
    if (hasCitySelected) {
      onUpdateFilter("distance", localDistance);
    }
    onClose();
  };

  const handleClearAll = () => {
    onClearAll();
    setLocalSearch("");
    setLocalDistance(5);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="flex-shrink-0 px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">Filtry</SheetTitle>
            <SheetClose className="rounded-full p-2 hover:bg-muted transition-colors">
              <X className="w-5 h-5" />
            </SheetClose>
          </div>
        </SheetHeader>

        {/* Scrollable content */}
        <ScrollArea className="flex-1 px-4">
          {/* Search input */}
          {/* TODO: Gdy FEATURES.SEARCH_AUTOCOMPLETE === true, zamień na SearchAutocomplete komponent
              z dropdownem matchujących atrakcji. Dane lokalne, filtrowanie instant.
              Kliknięcie wyniku → nawigacja do /atrakcje/:slug */}
          <div className="py-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Szukaj aktywności..."
                className="w-full pl-10 pr-4 py-3 rounded-xl text-base bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
              {localSearch && (
                <button
                  onClick={() => setLocalSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* City filter — hidden in single-city MVP */}
          {FEATURES.MULTI_CITY && (
            <>
              <FilterSection
                title="Miasto"
                options={filterCounts.city}
                selectedValue={filters.city}
                onSelect={(value) => onUpdateFilter("city", value)}
              />
              
              {/* Distance slider - shown when city selected */}
              {hasCitySelected && (
                <div className="py-4 border-b border-border bg-muted/30 -mx-4 px-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-primary" />
                      Atrakcje w pobliżu
                    </h3>
                    <span className="text-base font-semibold text-primary">
                      {localDistance} km
                    </span>
                  </div>
                  
                  <div className="px-1">
                    <Slider
                      value={[localDistance]}
                      onValueChange={(values) => setLocalDistance(values[0])}
                      min={0}
                      max={100}
                      step={5}
                      className="w-full touch-pan-y"
                    />
                  </div>
                  
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground px-1">
                    <span>0 km</span>
                    <span>50 km</span>
                    <span>100 km</span>
                  </div>
                </div>
              )}
            </>
          )}
          
          <FilterSection
            title="Wiek dziecka"
            options={filterCounts.age}
            selectedValue={filters.age}
            onSelect={(value) => onUpdateFilter("age", value)}
          />
          
          <FilterSection
            title="Typ aktywności"
            options={filterCounts.type}
            selectedValue={filters.type}
            onSelect={(value) => onUpdateFilter("type", value)}
          />
          
          <FilterSection
            title="W pomieszczeniu / Na zewnątrz"
            options={filterCounts.indoor}
            selectedValue={filters.indoor}
            onSelect={(value) => onUpdateFilter("indoor", value)}
          />
          
          <FilterSection
            title="Cena"
            options={filterCounts.price}
            selectedValue={filters.price}
            onSelect={(value) => onUpdateFilter("price", value)}
          />
          
          {/* Typ atrakcji filter - hidden in MVP, structure preserved */}
          {/* 
          <FilterSection
            title="Typ atrakcji"
            options={filterCounts.activityKind}
            selectedValue={filters.activityKind}
            onSelect={(value) => onUpdateFilter("activityKind", value)}
          />
          */}
        </ScrollArea>

        {/* Footer with actions */}
        <div className="flex-shrink-0 px-4 py-4 border-t border-border bg-background">
          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={handleClearAll}
                className="flex-1"
              >
                Wyczyść
              </Button>
            )}
            <Button
              onClick={handleApply}
              className="flex-1"
            >
              Pokaż wyniki ({filterCounts.filtered})
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileFilterSheet;
