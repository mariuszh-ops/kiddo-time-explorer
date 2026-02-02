import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Search } from "lucide-react";
import { Filters } from "@/hooks/useActivityFilters";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    total: number;
    filtered: number;
    hasAnyFilter: boolean;
  };
  onUpdateFilter: (key: keyof Filters, value: string | undefined) => void;
  onClearAll: () => void;
}

// Disabled filter section with helper text
const DisabledFilterSection = ({
  title,
  helperText,
}: {
  title: string;
  helperText: string;
}) => {
  return (
    <div className="py-4 border-b border-border last:border-b-0 opacity-60">
      <h3 className="text-base font-semibold text-muted-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground italic">{helperText}</p>
    </div>
  );
};

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
  const hasActiveFilters = Object.values(filters).some(Boolean) || searchQuery.trim().length > 0;
  const hasCitySelected = Boolean(filters.city);

  const handleApply = () => {
    onSearchChange(localSearch);
    onClose();
  };

  const handleClearAll = () => {
    onClearAll();
    setLocalSearch("");
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

          {/* City filter */}
          <FilterSection
            title="Miasto"
            options={filterCounts.city}
            selectedValue={filters.city}
            onSelect={(value) => onUpdateFilter("city", value)}
          />
          
          {/* Distance filter - conditionally enabled */}
          {hasCitySelected ? (
            <FilterSection
              title="W pobliżu"
              options={filterCounts.distance}
              selectedValue={filters.distance}
              onSelect={(value) => onUpdateFilter("distance", value)}
            />
          ) : (
            <DisabledFilterSection
              title="W pobliżu"
              helperText="Wybierz miasto, aby zobaczyć atrakcje w pobliżu"
            />
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
