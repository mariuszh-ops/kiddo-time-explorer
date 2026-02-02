import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X, Check, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterOption {
  value: string;
  label: string;
  count: number;
}

interface CityFilterDropdownProps {
  cityOptions: FilterOption[];
  distanceOptions: FilterOption[];
  selectedCity?: string;
  selectedDistance?: string;
  hasAnyFilter: boolean;
  onCitySelect: (value: string | undefined) => void;
  onDistanceSelect: (value: string | undefined) => void;
}

// Helper to get short distance label
const getShortDistanceLabel = (distanceValue: string): string => {
  const labels: Record<string, string> = {
    center: "centrum",
    "25km": "+25 km",
    "50km": "+50 km",
    "100km": "+100 km",
  };
  return labels[distanceValue] || "";
};

const CityFilterDropdown = ({
  cityOptions,
  distanceOptions,
  selectedCity,
  selectedDistance,
  hasAnyFilter,
  onCitySelect,
  onDistanceSelect,
}: CityFilterDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, openUpward: false });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCityOption = cityOptions.find((o) => o.value === selectedCity);
  
  // Build combined display label
  const getDisplayLabel = () => {
    if (!selectedCityOption) return "Miasto";
    if (selectedDistance) {
      return `${selectedCityOption.label} ${getShortDistanceLabel(selectedDistance)}`;
    }
    return selectedCityOption.label;
  };

  const displayLabel = getDisplayLabel();
  const hasSelection = Boolean(selectedCity);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = 400; // Estimated max height for combined dropdown
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
    
    setDropdownPosition({
      top: openUpward ? rect.top : rect.bottom + 8,
      left: rect.left,
      openUpward,
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
    }
    
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current && 
        !buttonRef.current.contains(target) &&
        dropdownRef.current && 
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Handle clearing both city and distance
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCitySelect(undefined);
    onDistanceSelect(undefined);
    setIsOpen(false);
  };

  const dropdownMenu = isOpen ? (
    <div
      ref={dropdownRef}
      className={cn(
        "fixed min-w-[220px] bg-popover border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200",
        dropdownPosition.openUpward && "origin-bottom"
      )}
      style={{
        top: dropdownPosition.openUpward ? "auto" : `${dropdownPosition.top}px`,
        bottom: dropdownPosition.openUpward ? `${window.innerHeight - dropdownPosition.top + 8}px` : "auto",
        left: `${dropdownPosition.left}px`,
        zIndex: 9999,
      }}
    >
      <div className="max-h-[400px] overflow-y-auto">
        {/* City section */}
        <div className="py-2">
          <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Miasto
          </div>
          {cityOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onCitySelect(option.value);
                // Don't close if selecting city - allow distance selection
              }}
              className={cn(
                "w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors",
                option.value === selectedCity
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              )}
            >
              <span>{option.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">({option.count})</span>
                {option.value === selectedCity && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </div>
            </button>
          ))}
        </div>
        
        {/* Distance section - only when city is selected */}
        {selectedCity && (
          <>
            <div className="border-t border-border" />
            <div className="py-2">
              <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <MapPin className="w-3 h-3" />
                W pobliżu
              </div>
              {distanceOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onDistanceSelect(selectedDistance === option.value ? undefined : option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors",
                    option.value === selectedDistance
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <span>{option.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">({option.count})</span>
                    {option.value === selectedDistance && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap",
          "border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
          hasSelection
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-accent"
        )}
      >
        <span className="max-w-[160px] truncate">{displayLabel}</span>
        {hasSelection ? (
          <X
            className="w-3.5 h-3.5 ml-0.5 hover:scale-110 transition-transform"
            onClick={handleClear}
          />
        ) : (
          <ChevronDown className={cn(
            "w-3.5 h-3.5 transition-transform",
            isOpen && "rotate-180"
          )} />
        )}
      </button>
      
      {createPortal(dropdownMenu, document.body)}
    </>
  );
};

export default CityFilterDropdown;
